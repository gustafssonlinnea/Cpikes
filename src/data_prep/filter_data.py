from functools import reduce
import glob
import json
import sys
import os

import cv2
from fastdtw import fastdtw
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image
import scipy.cluster.hierarchy as sch
import scipy.spatial.distance as ssd


sys.setrecursionlimit(92000)  # TODO: Remove if changed from recursion to while loops


class FilteredData:
    def __init__(self, snn, test_input_num=0, verbose=True, show_dendrogram=False):
        self.verbose = verbose
        self.test_input_num = test_input_num
        self.snn = snn
        self.df = snn.df[snn.df['test_input_num'] == test_input_num].copy()
        self.df.reset_index(drop=True, inplace=True)
        self.target = int(self.df['target'][0])
        self.df, dtw_linkage = self.filter(snn.df)
        self.linkage_to_json_hierarchy(dtw_linkage, 'DTW')
        self.df_to_json()
        self.inputs = snn.inputs
        self.input_max = self.inputs.max()
        self.save_images_of_test_input()
        self.save_input_gif_of_test_input()
        self.output = self.get_output()
        self.network_metadata_to_json()
        self.test_input_metadata_to_json()
        self.dist_matrix_to_json(self.dtw_distances, 'DTW')
        
        if show_dendrogram:
            sch.dendrogram(dtw_linkage)
            plt.show()
        
        if self.verbose:
            print(f'\nFILTERING: {snn.file_name}, test input {test_input_num}\n')
            print(dtw_linkage)
            print("Max DTW distance:", self.max_dtw_dist)
        
        
    def get_output(self):
        # Filter the dataframe to get only neurons in the last layer
        last_layer_neurons = self.df[self.df['layer_num'] == self.df['layer_num'].max()]

        # Find the maximum firing rate in the last layer
        max_firing_rate = last_layer_neurons['firing_rate'].max()

        # Filter the dataframe again to get the neuron(s) with the maximum firing rate
        neurons_with_max_firing_rate = last_layer_neurons[last_layer_neurons['firing_rate'] == max_firing_rate]

        # Get the neuron number(s) with the highest firing rate
        neuron_numbers_highest_firing_rate = neurons_with_max_firing_rate['neuron_num'].tolist()

        return neuron_numbers_highest_firing_rate

    
    def filter(self, original_df):
        
        # TODO: Clean this up (this was a temporary solution, 
        # self.df should be used directly instead of saved in df)
        df = self.df  
        
        # ----- Similarity matrices -----
        # ISI-distance TODO
        
        # SPIKE-distance TODO
        
        # SPIKE-synchronization complement TODO
        
        # DTW distance
        self.dtw_distances, dtw_linkage = self.get_dtw_distances_and_linkage(df)
        
        if self.verbose:
            print("dtw_distances:\n", self.dtw_distances)
        
        self.max_dtw_dist = int(np.max(dtw_linkage[:, 2]))
        
        # ----- Neuron dataframe -----
        # Firing rate
        df['firing_rate'] = df['spike_trains'].apply(lambda spike_train: np.mean(spike_train))
        df['low_firing_rate'] = df['firing_rate'].apply(lambda r: 1 if r == 0 else 0)  # TODO: Remove this entry? Unused
        df['high_firing_rate'] = df['firing_rate'].apply(lambda r: 1 if r == 1 else 0)  # TODO: Remove this entry? Unused
        
        # Similarity/distance to target
        df['dtw_dist_to_target'] = self.get_distances_to_target(self.dtw_distances)
        self.max_dtw_dist_to_target = int(df['dtw_dist_to_target'].max())
    
        return df, dtw_linkage
    
    def get_distances_to_target(self, distances):
        target_index = self.df[self.df['is_target'] == 1].index

        distances_to_targets = []

        for index in range(self.df.shape[0]):
            distances_to_targets.append(float(distances[target_index, index]))

        return distances_to_targets
        
    def get_dtw_distances_and_linkage(self, df, recalculate=False):
        file_dir = 'cache/DTW/'
        file_name_dir = f'{self.snn.file_name}/'
        
        file_dir_distances = file_dir + 'distances/' + file_name_dir
        file_dir_linkage = file_dir + 'linkages/' + file_name_dir
        os.makedirs(file_dir_distances, exist_ok=True)
        os.makedirs(file_dir_linkage, exist_ok=True)
        distances_file_path = f'{file_dir_distances}dtw_distances_test_input_{self.test_input_num}.npy'
        linkage_file_path = f'{file_dir_linkage}dtw_linkage_test_input_{self.test_input_num}.npy'
        
        if not recalculate:
            try:
                if self.verbose:
                    print('Loading DTW files')
                distances = np.load(distances_file_path)
                linkage_matrix = np.load(linkage_file_path)
            except FileNotFoundError:
                if self.verbose:
                    print('DTW matrix not previously calculated: Creating DTW files')
                distances, linkage_matrix = self.calculate_dtw_distances_and_linkage(
                    distances_file_path, linkage_file_path
                )
        else:
            if self.verbose:
                print('Creating DTW files')
            distances, linkage_matrix = self.calculate_dtw_distances_and_linkage(
                distances_file_path, linkage_file_path
            )
        
        return distances, linkage_matrix
    
    def calculate_dtw_distances_and_linkage(self, distances_file_path, linkage_file_path):
        distances = self.dtw_distances(
            np.array(self.df[self.df['test_input_num'] == self.test_input_num]['spike_trains'])  # TODO: Necessary to make np.array?
        )
        np.save(distances_file_path, distances)
        linkage_matrix = self.dtw_linkage(distances)
        np.save(linkage_file_path, linkage_matrix)
        
        return distances, linkage_matrix
    
    def dtw_distances(self, spike_trains):
        # Initialize distances with inf values
        distances = np.full((len(spike_trains), len(spike_trains)), np.inf)

        # Calculate DTW distances
        for i in range(len(spike_trains)):
            for j in range(i + 1, len(spike_trains)):
                distance, _ = fastdtw(spike_trains[i], spike_trains[j])
                distances[i, j] = distance
                distances[j, i] = distance  # Ensure symmetry

        # Set diagonal elements to zero
        np.fill_diagonal(distances, 0)
        
        return distances

    def dtw_linkage(self, distances, method='weighted'):
        # Convert to condensed form
        condensed_distances = ssd.squareform(distances)

        # Hierarchical clustering
        linkage_matrix = sch.linkage(condensed_distances, method=method) 
        
        return linkage_matrix
    
    def linkage_to_json_hierarchy(self, clusters, metric_name, cutoff=0, path='processedData/hierarchies/'):        
        
        def add_node(node, parent):
            new_node = {
                'node_id': node.id,
                'value': node.dist,
                'children': [],
                'count': node.count
            }
            
            append_node = False
            
            if node.dist > cutoff:  # TODO: Unreached block, but may be useful for future implementations. If not, this can be removed.
                append_node = True
                recursion_parent = new_node
                if node.dist == parent['value']:
                    append_node = False
                    recursion_parent = parent
            else:  # Flatten the clusters below the cutoff
                if node.is_leaf():  # If node is a neuron
                    append_node = True
                    new_node['value'] = parent['value'] - 1
                    
                if parent['value'] > cutoff:
                    append_node = True
                    recursion_parent = new_node
                else:
                    recursion_parent = parent
                
            if append_node:
                parent['children'].append(new_node)  # Append clusters above cutoff and append neurons
            if node.left: 
                add_node(node.left, recursion_parent)
            if node.right: 
                add_node(node.right, recursion_parent)

        tree = sch.to_tree(clusters, rd=False)
        d3_hierarchy = {
            'value': sys.maxsize,
            'children': [],
            'name': 'Root'
        }
        add_node(tree, d3_hierarchy)
        
        cn_id_to_neuron_id = dict(
            enumerate(self.df[self.df['test_input_num'] == self.test_input_num]['neuron_id'])
        )
        
        def create_neuron_IDs(node):
            # If the node is a leaf, then it's a neuron and we use the neuron ID
            if len(node['children']) == 0:
                neuron_IDs = [cn_id_to_neuron_id[node['node_id']]]

            # If not, it's a cluster
            # We then set its neuron ID to the neuron IDs of all the leaves of the node's subtree
            else:
                # TODO: Use while loop instead of recursion (to avoid reached recursion depth and unnecessarily long runtimes)
                neuron_IDs = reduce(lambda ls, c: ls + create_neuron_IDs(c), node['children'], [])

            # If there are multiple neuron IDs, they are separated by "-"
            node['neuron_id'] = '-'.join(sorted(map(str, neuron_IDs)))
            
            if len(node['children']) == 0:
                node['firing_rate'] = float(self.df.loc[self.df['neuron_id'] == node['neuron_id'], 
                                                        'firing_rate'].values[0])

            return neuron_IDs

        d3_hierarchy = d3_hierarchy['children'][0]  # Remove the root
        create_neuron_IDs(d3_hierarchy)
        
        if cutoff == 0:  # Default
            file_name = f'{metric_name}HierarchyTestInput{self.test_input_num}.json'
        else:  # TODO: Unreached block (used if multiple cutoff levels were to be implemented)
            file_name = f'{metric_name}HierarchyTestInput{self.test_input_num}Cutoff{cutoff}.json'
            
        path += f'{self.snn.file_name}/{metric_name}/'
        self.save_json_file(d3_hierarchy, file_name, path)
    
    def dist_matrix_to_json(self, matrix, metric_name, path='processedData/distanceMatrices/'):
        json_data = []
        for i, row in enumerate(matrix):
            for j, value in enumerate(row):
                json_data.append({"x": i, "y": j, "value": value})
        
        file_name = f'{metric_name}DistMatrixTestInput{self.test_input_num}.json'
        path += f'{self.snn.file_name}/{metric_name}/'
        
        self.save_json_file(json_data, file_name, path)
    
    def df_to_json(self, output_dir='processedData/networks/'):
        output_dir += f'{self.snn.file_name}/'
        os.makedirs(output_dir, exist_ok=True)
        file_name = f'networkTestInput{self.test_input_num}.json'
        self.df.to_json(output_dir + file_name, orient='records')
    
    def network_metadata_to_json(self, output_dir='processedData/networkMetadata/'):
        file_name = f'networkMetadataTestInput{self.test_input_num}.json'
        data = {
            'numNeurons': self.snn.num_neurons,
            'numLayers': self.snn.num_layers,
            'numTestInputs': self.snn.num_test_inputs,
            'tau': self.snn.tau,
            'lr': self.snn.lr,
            'crop': self.snn.crop,
            'mul': self.snn.mul
        }
        output_dir += f'{self.snn.file_name}/'
        self.save_json_file(data, file_name, output_dir)
    
    def test_input_metadata_to_json(self, output_dir='processedData/testInputMetadata/'):
        file_name = f'testInputMetadataTestInput{self.test_input_num}.json'
        data = {
            'testInputNum': self.test_input_num,
            'target': self.target,
            'output': self.output,
            'numTimeBins': self.snn.num_time_bins,
            'binSize': self.snn.bin_size,
            'maxDtwDist': self.max_dtw_dist,
            'maxDtwDistToTarget': self.max_dtw_dist_to_target
        }
        output_dir += f'{self.snn.file_name}/'
        self.save_json_file(data, file_name, output_dir) 
        
    def save_json_file(self, data, file_name, output_dir):
        os.makedirs(output_dir, exist_ok=True)
        json.dump(data, open(output_dir + file_name, 'w'), 
                  sort_keys=True, indent=4)

        if self.verbose:
            print(f'{file_name} successfully saved')
                
    def save_images_of_test_input(self, output_dir='cache/exported_images'):
        output_dir += f'/{self.snn.file_name}'
        output_dir += f'/test_input_{self.test_input_num}'
        os.makedirs(output_dir, exist_ok=True)
        test_input_images = self.inputs[:, self.test_input_num]
        images_exist = True

        for i, image in enumerate(test_input_images):
            filename = os.path.join(output_dir, f'image_{i}.png')
            if not os.path.exists(filename):
                scaled_image = (255 * (image / self.input_max)).astype(np.uint8)
                cv2.imwrite(filename, scaled_image)  # Save the image as a PNG file
                images_exist = False
    
        if self.verbose:
            if images_exist: 
                print("Image already exists, no export needed.")
            else: 
                print('Images export complete.')
        
    def save_input_gif_of_test_input(self, 
                                image_folder='cache/exported_images/', 
                                output_dir='processedData/exportedGIFs/'):
        image_folder += f'{self.snn.file_name}/'
        output_dir += f'{self.snn.file_name}/'
        os.makedirs(output_dir, exist_ok=True)
        file_path = output_dir + f'testInput{self.test_input_num}.gif'
        
        if not os.path.exists(file_path):
            frames = [Image.open(image) for image in glob.glob(
                f"{image_folder}/test_input_{self.test_input_num}/*.png"
            )]
            frame_one = frames[0]
            frame_one.save(file_path, 
                        format='GIF', 
                        append_images=frames,
                        save_all=True, 
                        duration=100, 
                        loop=0)
    
            if self.verbose:
                print("GIF export complete.")

        else:
            if self.verbose:
                print("GIF already exists, export not needed.")

import pickle
import numpy as np
import pandas as pd


PATH = 'data/results/'


class SNN:
    def __init__(self, 
                 path=PATH,
                 file_name='3layers_spiking_40-20-10_tau-100_lr-0.01_crop-True_mul-1.0', 
                 df=None, 
                 inputs=None,
                 bin_size=10):
        self.file_name = file_name
        
        metadata = self.extract_metadata()
        self.num_layers = metadata['num_layers']
        self.num_neurons = metadata['num_neurons']
        self.tau = metadata['tau']
        self.lr = metadata['lr']
        self.crop = metadata['crop']
        self.mul = metadata['mul']
        
        self.bin_size = bin_size
        self.num_time_bins = None
        self.num_test_inputs = None
        
        self.df, self.inputs = self.pickle_to_df(path=path, 
                                                 file_name=file_name)
        
    def extract_metadata(self):
        # Split the string by underscores
        parts = self.file_name.split('_')

        # Initialize dictionary to store extracted data
        extracted_data = {}

        # Extract num_layers
        num_layers = int(parts[0][0])
        extracted_data['num_layers'] = num_layers

        # Extract num_neurons
        num_neurons = list(map(int, parts[2].split('-')))
        extracted_data['num_neurons'] = num_neurons

        # Extract other parameters
        for part in parts[3:]:
            res = part.split('-')
            if len(res) == 2:
                key, value = res
            elif len(res) == 3:
                key, value = res[0], '-'.join(res[1:])
            if value.isdigit():
                value = int(value)
            elif value.lower() == 'true':
                value = True
            elif value.lower() == 'false':
                value = False
            elif '.' in value:
                value = float(value)
            extracted_data[key] = value

        return extracted_data

    def pickle_to_df(self, path, file_name):
        def structure_data(data):
            return np.stack([np.expand_dims(sample, axis=0) for sample in data], axis=0)
        
        spikes_file_name = file_name + '_spikes.pkl'
        potentials_file_name = file_name + '_potential.pkl'
        targets_file_name = file_name + '_targets.pkl'
        
        with open(path + spikes_file_name, 'rb') as f:
            spikes = pickle.load(f)
        
        self.num_layers = len(spikes) - 1
        
        # layer 0 has num_time_bins + 1 time steps, layer 1 has num_time_bins + 2 time steps, etc.
        self.num_time_bins = len(spikes[0])
        
        # TODO: Use zero-padding so all trains have the same number of time steps?
        self.num_test_inputs = len(spikes[0][0])
        self.input_image_height = len(spikes[0][0][0][0])
        self.input_image_width = len(spikes[0][0][0][0][0])
        
        # Save input of shape (time steps, test inputs, image height, image width)
        inputs = structure_data(spikes[0])
        inputs = inputs.reshape(
            self.num_time_bins,
            self.num_test_inputs, 
            self.input_image_height, 
            self.input_image_width)
        
        spikes = np.array(spikes[1:], dtype=object)
        
        with open(path + potentials_file_name, 'rb') as f:
            potentials = np.array(pickle.load(f)[1:], dtype=object)
            
        with open(path + targets_file_name, 'rb') as f:
            targets = pickle.load(f)

        d = []
        for layer_num in range(self.num_layers):
            layer_spikes = structure_data(spikes[layer_num])
            num_neurons = self.num_neurons[layer_num]
            num_time_bins = len(layer_spikes)
            layer_spikes = layer_spikes.reshape(num_time_bins, self.num_test_inputs, num_neurons)
            layer_potentials = structure_data(potentials[layer_num])
            layer_potentials = layer_potentials.reshape(num_time_bins, self.num_test_inputs, num_neurons)
            
            for test_input_num in range(self.num_test_inputs):
                for neuron_num in range(len(layer_spikes[0][test_input_num])):
                    spike_train = layer_spikes[:, test_input_num, neuron_num].T
                    potential_over_time = layer_potentials[:, test_input_num, neuron_num].T
                    target = targets[test_input_num]
                    is_target = 0
                    if layer_num == self.num_layers - 1 and neuron_num == target:
                        is_target = 1
                    
                    d.append({
                        'neuron_id': f'L{layer_num}N{neuron_num}',
                        'layer_num': layer_num, 
                        'neuron_num': neuron_num,
                        'spike_trains': spike_train,
                        'potential_series': potential_over_time,
                        'test_input_num': test_input_num,
                        'target': target,
                        'is_target': is_target
                    })
        df = pd.DataFrame(data=d)
        return df, inputs


if __name__ == '__main__':
    print(SNN().df)
    
import os
from filter_data import FilteredData
from load_SNN import SNN

import json


def extract_file_names():
    # Directory containing the files
    directory = 'data/results'
    file_names = []

    # Iterate over files in the directory
    for file_name in os.listdir(directory):
        # Check if the file ends with "_spikes.pkl"
        if file_name.endswith("_spikes.pkl"):
            # Extract the filename before the last underscore
            file_parts = file_name.split('_')
            file_name_before_last_underscore = '_'.join(file_parts[:-1])
            print(file_name_before_last_underscore)
            file_names.append(file_name_before_last_underscore)
               
    with open("processedData/modelFileNames.json", "w") as json_file:
        json.dump(file_names, json_file, indent=4)

def export_all(process_from_file_index=0, read_files=True, filter_data=True):
    with open("processedData/modelFileNames.json", 'r') as file:
        file_names = json.load(file)
        
    for file_name_before_last_underscore in file_names[process_from_file_index:]:
        if read_files:
            snn = SNN(file_name=file_name_before_last_underscore)
        if filter_data:
            for test_input_num in range(snn.num_test_inputs):
                _ = FilteredData(snn, test_input_num=test_input_num)

def export_file(file_name):
    snn = SNN(file_name=file_name)
    for test_input_num in range(snn.num_test_inputs):
        _ = FilteredData(snn, test_input_num=test_input_num)
        
def export_file_one_test_input(file_name, test_input_num=0, show_dendrogram=False):
    snn = SNN(file_name=file_name)
    _ = FilteredData(snn, test_input_num=test_input_num, show_dendrogram=show_dendrogram)


if __name__ == '__main__':
    # Exports all files (this takes a while)
    export_all()
    
    # Faster example, only one network model
    # export_file('3layers_spiking_40-20-10_tau-100_lr-0.01_crop-True_mul-1.0')
    
    # One can also export only one test input of a particular network model
    # export_file_one_test_input('4layers_spiking_1000-400-80-10_tau-100.0_lr-0.01_crop-False_mul-1.0', 1)

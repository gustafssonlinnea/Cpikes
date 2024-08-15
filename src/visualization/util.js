const setUpMainInfoSymbolAndInfoBox = () => {
    const infoBox = document.getElementById('info-box');
    const infoSymbol = document.getElementById('info-header');

    infoSymbol.addEventListener('mouseover', () => {    
        infoBox.style.display = 'block';
    });

    infoSymbol.addEventListener('mouseout', () => {
        infoBox.style.display = 'none';
    });
}

const getDtwDistToTarget = neuronId => {
    const neuron = networkHashtable[neuronId];
    let value;
    if (neuron) {
        value = neuron.dtw_dist_to_target;  // TODO: Make sure field is valid
    }
    return value;
}

const createHashtableFromJSONData = (data, hashtable = {}) => {
    // Iterate over the JSON array and populate the hashtable
    data.forEach(item => {
        hashtable[item.neuron_id] = item;
    });
    return hashtable;
}

const createNeuronIDToNodeIDTable = data => {
    const hashtable = {}
    data.forEach((neuron, i) => {
        hashtable[neuron.neuron_id] = i;
    });
    return hashtable;
}

const createNodeIDToNeuronIDTable = data => {
    const hashtable = {}
    data.forEach((neuron, i) => {
        hashtable[i] = neuron.neuron_id;
    });
    return hashtable;
}

const isNeuronTarget = neuronId => {
    const neuron = networkHashtable[neuronId];
    const isTarget = neuron && networkHashtable[neuronId].is_target === 1;
    return isTarget;
}

const capitalizeFirstLetter = str => `${str.charAt(0).toUpperCase()}${str.slice(1)}`;

const getIncludedLayers = (selectedNeuronIDs = null) => {
    if (!selectedNeuronIDs) {
        selectedNeuronIDs = getSelectedNeuronIDs();
    }
    if (selectedNeuronIDs.length === 0) {
        return null; // Handle case when no neurons are selected
    }

    const uniqueLayers = new Set();
    selectedNeuronIDs.forEach(neuronID => {
        const neuronData = networkHashtable[neuronID];
        uniqueLayers.add(neuronData.layer_num);
    });

    // Convert Set to array and sort it
    let includedLayers = [...uniqueLayers].sort();
    includedLayers = includedLayers == null ? includedLayers : includedLayers.join(", ");
    return includedLayers;
};

const calculateStats = (selectedNeuronIDs = null) => {
    const generalStats = {
        numNeurons: null,
        includedLayers: null
    };

    const firingRateStats = {
        mean: null,
        stdDev: null,
        min: null,
        max: null,
        median: null
    };

    const distToTargetStats = {
        mean: null,
        stdDev: null,
        min: null,
        max: null,
        median: null
    };

    if (!selectedNeuronIDs) {
        selectedNeuronIDs = getSelectedNeuronIDs();
    }

    generalStats.numNeurons = selectedNeuronIDs.length;
    generalStats.includedLayers = getIncludedLayers(selectedNeuronIDs);

    if (selectedNeuronIDs.length > 0) {
        const firingRates = networkVar
            .filter(neuron => selectedNeuronIDs.includes(neuron.neuron_id))
            .map(neuron => neuron.firing_rate);

        const distToTargets = networkVar
            .filter(neuron => selectedNeuronIDs.includes(neuron.neuron_id))
            .map(neuron => neuron.dtw_dist_to_target);

        calculateStatsFromArray(firingRates, firingRateStats);
        calculateStatsFromArray(distToTargets, distToTargetStats);
    }

    return {
        generalStats: generalStats,
        firingRateStats: firingRateStats,
        distToTargetStats: distToTargetStats
    };;
};

const calculateStatsFromArray = (array, dict) => {
    // Mean
    const total = array.reduce((acc, rate) => acc + rate, 0);
    const mean = total / array.length;
    dict.mean = roundIfDecimals(mean);

    // Standard deviation
    const meanSquaredDifference = array.reduce((acc, rate) => acc + Math.pow(rate - mean, 2), 0);
    const variance = meanSquaredDifference / array.length;
    const stdDeviation = Math.sqrt(variance);
    dict.stdDev = roundIfDecimals(stdDeviation);

    // Min and max
    dict.min = roundIfDecimals(Math.min(...array));
    dict.max = roundIfDecimals(Math.max(...array));

    // Median
    array.sort((a, b) => a - b);
    const middleIndex = Math.floor(array.length / 2);
    const median = array.length % 2 === 0 ?
        (array[middleIndex - 1] + array[middleIndex]) / 2 :
        array[middleIndex];
    dict.median = roundIfDecimals(median);
}

const calculateMeanFromArray = array => {
    const total = array.reduce((acc, rate) => acc + rate, 0);
    const mean = total / array.length;
    return mean;
}

function isDissimilarToTarget(neuronID) {
    const dtwDistToTarget = getDtwDistToTarget(neuronID);
    return dtwDistToTarget > sliderTargetDissim.value;
}

function removeTrailingZeros(num) {
    return new Intl.NumberFormat('en-US', { useGrouping: false }).format(num)
}

const roundIfDecimals = (number, numDec = numDecimals) => {
    return number.toString().includes('.') ? removeTrailingZeros(number.toFixed(numDec)) : number;
}

const getNumSelectedNeurons = () => {
    return selectedNeurons.reduce((count, value) => {
        return count + (value ? 1 : 0);
    }, 0);
}

const getDistBetweenNeurons = (neuronID0, neuronID1) => {
    return distanceMatrixVar.find(
        obj => obj.x === neuronIDToNodeID[neuronID0] && obj.y === neuronIDToNodeID[neuronID1]
    ).value;
}

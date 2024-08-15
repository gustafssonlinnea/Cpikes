/**
 * TODO: Set selectedNeurons as input argument into functions so this script (selection.js) 
 * can be read before main.js in index.html
 */

const getSelectedNeuronIDs = () => {
    const selectedNeuronIDs = selectedNeurons.reduce((acc, isSelected, index) => {
        if (isSelected) {
            acc.push(nodeIDToNeuronID[index]); // Map node IDs to neuron IDs
        }
        return acc;
    }, [])
    return selectedNeuronIDs;
}

const deselectAllCircles = () => {
    g.selectAll("circle").each(function() {
        // Reset color for each circle
        d3.select(this)
            .attr('stroke', updateStrokeColor)
            .attr('stroke-width', updateStrokeWidth);
    });
}

// Function to toggle the selection state of a neuron
function toggleNeuronSelection(neuron) {
    const nodeID = neuron.data.node_id;
    console.log("toggleNeuronSelection for node ID:", nodeID);
    selectedNeurons[nodeID] = !selectedNeurons[nodeID];
    
    updateSelectedChildrenClusters();
    updateVisualizationBySelection();
}

function updateSelectedChildrenClusters() {
    deselectChildrenClusters();

    neurons.each(neuron => {
        if (selectedNeurons[neuron.data.node_id]) {
            neuron.ancestors().forEach(ancestor => {
                if (ancestor.children) {
                    selectedChildrenClusters[ancestor.data.node_id] = true;
                }
            });
        }
    });
}

function deselectChildrenClusters() {
    clusters.each(function(d) {
        selectedChildrenClusters[d.data.node_id] = false;
    });
}

function updateNeuronSelection(neuronIDs, select) {
    neuronIDs.forEach(neuronID => {
        selectedNeurons[neuronIDToNodeID[neuronID]] = select;
    })
}

function toggleClusterSelection(cluster) {
    selectedClusters[cluster.data.node_id] = !selectedClusters[cluster.data.node_id];
    const selected = selectedClusters[cluster.data.node_id];

    // Select/deselect all cluster children
    cluster.descendants().forEach(clusterChild => {
        if (clusterChild.children) {
            selectedClusters[clusterChild.data.node_id] = selected;
        }
    });
    // Select/deselect all neurons in selected/deselected cluster
    const selectedNeuronIDs = cluster.data.neuron_id.split("-");
    updateNeuronSelection(selectedNeuronIDs, selected);
    updateSelectedChildrenClusters();
    updateVisualizationBySelection();
}

const deselectAllNeuronsAndClusters = () => {
    selectedNeurons.fill(false);
    for (const nodeID in selectedClusters) {
        selectedClusters[nodeID] = false;
        selectedChildrenClusters[nodeID] = false;
    }

    d3.select("#clear-button")
        .style("border-color", noSelectionStrokeColor)
        .style("color", noSelectionStrokeColor);
    updateVisualizationBySelection();
}

function setSelectionStatistics(selectedNeuronIDs) {
    const stats = calculateStats(selectedNeuronIDs);

    document.getElementById("num-selected-neurons").innerHTML = stats.generalStats.numNeurons;
    document.getElementById("included-layers").innerHTML = stats.generalStats.includedLayers;

    document.getElementById("average-firing-rate").innerHTML = stats.firingRateStats.mean;
    document.getElementById("std-dev-firing-rate").innerHTML = stats.firingRateStats.stdDev;
    document.getElementById("median-firing-rate").innerHTML = stats.firingRateStats.median;
    document.getElementById("min-firing-rate").innerHTML = stats.firingRateStats.min;
    document.getElementById("max-firing-rate").innerHTML = stats.firingRateStats.max;

    document.getElementById("mean-dist-target").innerHTML = stats.distToTargetStats.mean;
    document.getElementById("std-dev-dist-target").innerHTML = stats.distToTargetStats.stdDev;
    document.getElementById("median-dist-target").innerHTML = stats.distToTargetStats.median;
    document.getElementById("min-dist-target").innerHTML = stats.distToTargetStats.min;
    document.getElementById("max-dist-target").innerHTML = stats.distToTargetStats.max;

    var elements = document.querySelectorAll('#selection-table');
    let color;
    if (stats.generalStats.numNeurons > 0) {
        color = selectionStrokeColor;
    } else {
        color = noSelectionStrokeColor;
    }
    elements.forEach(function(element) {
        element.style.color = color;
    });
}

// Function to update the visualization based on the selectedNeurons array
const updateVisualizationBySelection = () => {
    // Update selection statistics
    const selectedNeuronIDs = getSelectedNeuronIDs();
    setSelectionStatistics(selectedNeuronIDs);

    // Update "Clear selection" button
    const numSelectedNeurons = selectedNeuronIDs.length;
    if (numSelectedNeurons > 0) {
        d3.select("#clear-button")
            .style("border-color", selectionStrokeColor)
            .style("color", selectionStrokeColor)
            .style("cursor", "pointer");
    } else {
        d3.select("#clear-button")
            .style("border-color", noSelectionStrokeColor)
            .style("color", noSelectionStrokeColor)
            .style("cursor", "not-allowed");
    }

    // Update strokes of neurons and clusters
    circles.style('stroke', updateStrokeColor);
    circles.style('stroke-width', updateStrokeWidth);
    clusters.style('stroke-dasharray', updateStrokeStyle);

    // Update supplementary visualizations
    spikeRaster(spikeTrains);
    potentialOverTime(potentials);
    distanceHeatmap(distanceMatrixVar);

    const neuronElements = document.getElementsByClassName("neuron");

    // Loop through each neuron element and add an event listener
    for (let i = 0; i < neuronElements.length; i++) {
        const neuronElement = neuronElements[i];
        setUpLinkingEventHandling(neuronElement);
    }
}

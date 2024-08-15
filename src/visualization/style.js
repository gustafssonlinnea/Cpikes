const width = 760;
const height = width;

const fillColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color-semi-transparent');
const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
const tertiaryColor = getComputedStyle(document.documentElement).getPropertyValue('--tertiary-color');
const quinaryColor = getComputedStyle(document.documentElement).getPropertyValue('--quinary-color');
const targetColor = getComputedStyle(document.documentElement).getPropertyValue('--target-color');
const defaultStrokeColor = getComputedStyle(document.documentElement).getPropertyValue('--default-stroke-color');
const hoverStrokeColor = getComputedStyle(document.documentElement).getPropertyValue('--hover-color');
const selectionStrokeColor = getComputedStyle(document.documentElement).getPropertyValue('--selection-color');
const noSelectionStrokeColor = getComputedStyle(document.documentElement).getPropertyValue('--no-selection-color');
const focusStrokeColor = "rgba(255, 255, 255)";
const focusFillColor = tertiaryColor;
const dissimilarToTargetStrokeColor = "transparent";
const disableColor = getComputedStyle(document.documentElement).getPropertyValue('--disable-color');
const axisDefaultColor = getComputedStyle(document.documentElement).getPropertyValue('--axis-default-color');

const defaultStrokeWidth = 1;
const strokeWidthCluster = getComputedStyle(document.documentElement).getPropertyValue('--stroke-width-cluster');
const strokeWidthNeuron = 3;
const selectionStrokeWidth = 3;

const numDecimals = 6;

const borderRadius = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--border-radius'));

const neuronStrokeWidth = d => d.r / 3;  // TODO: Do as with clusterStrokeWidth?

const hoverSizeLimit = 4;
const hoverDivisor = 8;

const clusterHoverStrokeWidth = d => {
    if (d == currentZoomedNode) {
        return focusStrokeWidth(d);
    }
    const limit = hoverSizeLimit;
    const divisor = hoverDivisor;
    return d.r < limit * divisor ? d.r / divisor: limit;
};

const focusStrokeWidth = d => {
    const limit = hoverSizeLimit * 2;
    const divisor = hoverDivisor / 2;
    return d.r < limit * divisor ? d.r / divisor: limit;
}

const hoverInfoHeight = getComputedStyle(document.documentElement).getPropertyValue('--hover-info-height');
const collapsibleTransitionTime = getComputedStyle(document.documentElement).getPropertyValue('--collapsible-transition-time');

const padding = getComputedStyle(document.documentElement).getPropertyValue('--padding');
const halfPadding = getComputedStyle(document.documentElement).getPropertyValue('--half-padding');
const midPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--mid-padding'));

const xColor = "rgb(85, 85, 85)";
const hoverXColor = "black";
const neuronColorRange = ["black", "red", "yellow", "white"]
const neuronCmapLinear = d3.interpolateRgbBasis(neuronColorRange);

const neuronRadius = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--neuron-radius'));
const neuronCenter = neuronRadius + 3;

const neuronCmap = firingRate => {
    return neuronCmapLinear(calculateColorValue(firingRate));
}

function calculateColorValue(x) {
    return Math.pow(x, 0.2 / Math.pow(x, 0.5));
}

const clusterCmap = (d, sliderInput = false) => {
    if (d === currentZoomedNode) {
        return focusFillColor;
    } else if (!sliderInput && (currentZoomedNode && currentZoomedNode.ancestors().includes(d))) {
        return fillColor;
    } else if (d.depth > sliderClusterDistCutoff.value) {
        const clusterNeuronIDs = d.data.neuron_id.split("-");
        const firingRates = networkVar
            .filter(neuron => clusterNeuronIDs.includes(neuron.neuron_id) && !isDissimilarToTarget(neuron.neuron_id))
            .map(neuron => neuron.firing_rate);
        if (firingRates.length > 0) {
            const meanFiringRate = calculateMeanFromArray(firingRates);
            return neuronCmap(meanFiringRate);
        } else {
            return disableColor;
        } 
    } else {
        return fillColor;
    }
}

const updateStrokeColor = d => {  // TODO: Make this function cleaner
    if (d == hoveredCluster) {
        return hoverStrokeColor;
    } else if (selectedNeurons[d.data.node_id]) {
        return selectionStrokeColor;
    } else if (selectedClusters[d.data.node_id] || selectedChildrenClusters[d.data.node_id]) {
        return selectionStrokeColor;
    } else if (!d.children && isDissimilarToTarget(d.data.neuron_id)) {
        return dissimilarToTargetStrokeColor;
    } else if (!d.children) {  // Check if the node represents a neuron
        // For neurons, stroke color is based on firing rate
        return neuronCmap(d.data.firing_rate);
    } else if (d === currentZoomedNode) {
        // For the current zoomed node, stroke color is focusStrokeColor
        return focusStrokeColor;
    } else {
        // For clusters, stroke color is defaultStrokeColor
        return defaultStrokeColor;
    }    
};

const updateStrokeWidth = d => {  // TODO: Make this function cleaner
    if (d === currentZoomedNode) {
        return focusStrokeWidth(d);
    } else if (selectedNeurons[d.data.node_id]) {
        return selectionStrokeWidth;
    } else if (d === hoveredCluster) {
        return clusterHoverStrokeWidth(d);
    } else if (selectedClusters[d.data.node_id] || selectedChildrenClusters[d.data.node_id]) {
        return selectionStrokeWidth;
    } else if (!d.children) {  // Check if the node represents a neuron
        return neuronStrokeWidth(d);
    } else {
        return strokeWidthCluster;
    }    
};

const updateStrokeStyle = d => {
    // Make stroke dashed if any of the cluster's children is selected, but not the cluster itself
    if (selectedChildrenClusters[d.data.node_id] && !selectedClusters[d.data.node_id]) {
        return getDashSize(d);
    } else {
        return '';
    }  
};

function getDashSize(d) {
    const circumference = 2 * Math.PI * d.r;

    // 10 means a dash/space is of size 10, rounding => dashSize is around 10
    const dashSize = circumference / Math.floor(circumference / (10 * 2)) / 2;

    const dashSizeFourDashes = circumference / (4 * 2);
    return dashSize > dashSizeFourDashes ? `${dashSizeFourDashes}` : `${dashSize}`;
} 

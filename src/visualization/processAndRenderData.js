const processAndRenderNetworkData = () => {
    setSpikingNeuralNetworkDashboard(networkMetaDataVar);
}

const processAndRenderTestInputData = () => {
    setTestInputDashboard(testInputMetaDataVar);
    setTestOutputDashboard(testInputMetaDataVar);
}

const setSpikingNeuralNetworkDashboard = networkMetaData => {
    renderNeuralNetwork(networkMetaData.numNeurons);
    document.getElementById("num-layers").innerHTML = networkMetaData.numLayers;
    document.getElementById("num-neurons").innerHTML = networkMetaData.numNeurons.join(", ");
    document.getElementById("tau").innerHTML = networkMetaData.tau;
    document.getElementById("lr").innerHTML = networkMetaData.lr;
    document.getElementById("crop").innerHTML = capitalizeFirstLetter(`${networkMetaData.crop}`);
    document.getElementById("mul").innerHTML = networkMetaData.mul;
}

const setTestInputDashboard = testInputMetaData => {
    document.getElementById("target").innerHTML = testInputMetaData.target;
    document.getElementById("spike-train-encoding").innerHTML = spikeTrainEncoding;
    document.getElementById("num-time-steps").innerHTML = parseInt(testInputMetaData.numTimeBins) 
        * parseInt(testInputMetaData.binSize);
    document.getElementById("num-bins").innerHTML = testInputMetaData.numTimeBins;
    document.getElementById("bin-size").innerHTML = testInputMetaData.binSize;
}

const setTestOutputDashboard = testInputMetaData => {
    document.getElementById("output").innerHTML = testInputMetaData.output.join(", ");
    if (testInputMetaData.output == testInputMetaData.target) {  // If correct
        document.getElementById("correct-output").innerHTML = "Correct";
        document.getElementById("led").classList.add("class", "led-green");
        document.getElementById("led").classList.remove("class", "led-yellow");
        document.getElementById("led").classList.remove("class", "led-red");
    } else {  // Incorrect or ambiguous
        let oneOutputIsCorrect = false;
        for (let i = 0; i < testInputMetaData.output.length; i++) {
            if (testInputMetaData.target == testInputMetaData.output[i]) {
                oneOutputIsCorrect = true;
            }
        }
        if (oneOutputIsCorrect) {  // If ambiguously correct
            document.getElementById("correct-output").innerHTML = "Ambiguous (one correct)";
            document.getElementById("led").classList.add("class", "led-yellow");
            document.getElementById("led").classList.remove("class", "led-green");
            document.getElementById("led").classList.remove("class", "led-red");
        } else {  // If incorrect or ambiguiously incorrect
            document.getElementById("correct-output").innerHTML = testInputMetaData.output.length == 1 ? "Incorrect" : "Ambiguous (all incorrect)";
            document.getElementById("led").classList.add("class", "led-red");
            document.getElementById("led").classList.remove("class", "led-green");
            document.getElementById("led").classList.remove("class", "led-yellow");
        }
    }
}

// Function to process fetched data and render visualization
const processAndRenderData = () => {
    const inputImage = document.getElementById("input-image");
    inputImage.src = inputImagePath;
    
    spikeTrains = networkVar
        .map(entry => entry.spike_trains);
    
    // Calculate maximum spike count across all spike trains
    maxSpikeCount = d3.max(spikeTrains.flatMap(d => d));
    if (maxSpikeCount === 0) {
        maxSpikeCount = networkMetaDataVar.binSize;
    }

    spikeRaster(spikeTrains);
    potentials = networkVar.map(entry => entry.potential_series);
    potentialOverTime(potentials);
    distanceHeatmap(distanceMatrixVar);
    
    d3.select("#cpikes").html("");  // Clear out potential previous plot

    svg = d3.select("#cpikes")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);

    g = svg.append("g");

    createXSymbol();

    xSymbol
        .on("click", resetZoom)
        .on("mouseover", () => {
            svg.selectAll(".x-line")
                .style("stroke", hoverXColor);
        })
        .on("mouseout", () => {
            svg.selectAll(".x-line")
                .style("stroke", xColor);
        });

    svg.call(zoom);
    toggleXSymbolVisibility(false);
    
    // TODO: Fix so that one cannot zoom when double-clicking outside the circles 
    // (only zoom out)
    // The code in this TODO block doesn't work but could be of help for future implementations
    svg.on("click", event => {
        if (event.target === svg.node()) { // Check if the click target is the SVG container
        }
    });

    // Event listener for the entire SVG container to reset zoom when clicking outside the largest circle
    svg.on("dblclick", event => {
        if (event.target === svg.node()) { // Check if the click target is the SVG container
            resetZoom(); // Reset zoom if clicked outside the largest circle
        }
    });
    // End of TODO

    // Create a pack layout
    const pack = d3.pack()
        .size([width, height]) // Size of the SVG container
        .padding(12); // Padding between circles

    // Assign the data to a hierarchy using the provided JSON
    const hierarchyRoot = d3.hierarchy(hierarchyVar)
        .sum(() => 1) // Use a constant size for each node
        .sort((a, b) => b.value - a.value); // Sort nodes by value (size)

    // Compute the pack layout
    const root = pack(hierarchyRoot);
    const nodes = root.descendants();
    setUpClusterDepthCutoff(nodes);

    // Append circles to represent each node
    circles = g.selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => d.r)
        .style("fill", d => d.children ? clusterCmap(d) : neuronCmap(d.data.firing_rate))
        .style("stroke", d => d.children ? defaultStrokeColor : neuronCmap(d.data.firing_rate))
        .style("stroke-width", d => d.children ? strokeWidthCluster : strokeWidthNeuron)
        .attr("id", d => d.data.neuron_id);
    clusters = circles.filter(d => d.children);
    neurons = circles.filter(d => !d.children);

    neurons.classed("neuron cpikes-neuron", true);

    const neuronElements = document.getElementsByClassName("neuron");

    // Loop through each neuron element and add an event listener
    for (let i = 0; i < neuronElements.length; i++) {
        const neuronElement = neuronElements[i];
        setUpLinkingEventHandling(neuronElement);
    }

    clusters.each(function(d) {
        selectedClusters[d.data.node_id] = false;
        selectedChildrenClusters[d.data.node_id] = false;
    });

    let clusterTimer;
    let neuronTimer;
    const doubleClickTimerDuration = 200;

    clusters
        .on("mouseover", (event, d) => {
            event.preventDefault();

            const tooltipHtml = getClusterHoverInfo(d);
            d3.select("#hover-info-container")
                .html(tooltipHtml)
                .style("border-color", hoverStrokeColor);
            
            hoveredCluster = d;
            d3.select(event.currentTarget)
                .style("stroke", updateStrokeColor)
                .style("stroke-width", updateStrokeWidth);
            
            hoverAncestors(d.data.neuron_id, true);
        })
        .on("mouseout", (event, d) => {
            hoveredCluster = null;
            d3.select("#vis-tooltip").style("display", "none");
            d3.select("#hover-info-container").html("").style("border-color", "transparent");
            d3.select(event.currentTarget)
                .style("stroke", updateStrokeColor)
                .style("stroke-width", updateStrokeWidth);
            
            hoverAncestors(d.data.neuron_id, true, true);
        })
        .on("dblclick", (event, d) => {
            clearTimeout(clusterTimer);
            toggleZoom(d);
            event.stopPropagation();
        })
        .on("click", (event, d) => {
            if (event.detail === 1) {
                clusterTimer = setTimeout(() => {
                    toggleClusterSelection(d); 
                    d3.select(event.currentTarget)
                        .style("stroke", updateStrokeColor)
                        .style("stroke-width", updateStrokeWidth);
                }, doubleClickTimerDuration);
              }
        });

    neurons
        .classed("drop-shadow", true)
        .on("mouseover", (event, _) => {
            event.preventDefault();
        })
        .on("dblclick", (event, d) => {
            clearTimeout(neuronTimer);
            toggleZoom(d);
            event.stopPropagation();
        })
        .on("click", (event, d) => {
            if (event.detail === 1) {
                neuronTimer = setTimeout(() => {
                    toggleNeuronSelection(d);
                    d3.select(event.currentTarget)
                        .style("stroke", updateStrokeColor)
                        .style("stroke-width",updateStrokeWidth);
                }, doubleClickTimerDuration);
              }
        });
    
    // Grey out neurons that are dissimilar to the target
    neurons.filter(d => isDissimilarToTarget(d.data.neuron_id))
        .classed("dissimilar-to-target", true)
        .style("stroke", updateStrokeColor);

    clusters.style("fill", clusterCmap);

    // On target dissimilarity limit slider change,
    sliderTargetDissim.oninput = () => {
        sliderValueTargetDissim.innerHTML = sliderTargetDissim.value;
        
        // Gray out neurons that are now regarded as dissimilar to the target
        neurons.filter(d => isDissimilarToTarget(d.data.neuron_id))
            .classed("dissimilar-to-target", true)  
            .style("stroke", updateStrokeColor);

        // and recolor those who are now regarded as similar to the target
        neurons.filter(d => !isDissimilarToTarget(d.data.neuron_id))  
            .classed("dissimilar-to-target", false)
            .style("stroke", updateStrokeColor);

        clusters.style("fill", clusterCmap);
    }

    // ----- Target -----
    // Apply pulse animation
    const pulseDuration = 1000; // Milliseconds
    const pulseAmplitude = 3;

    const createPulseCircle = neuron => {    
        // Create and return a new pulse circle
        const pulseCircle = g.append("circle")
            .classed("pulse-circle", true)
            .attr("r", 5 + neuron.attr("r") / 2)
            .attr("cx", neuron.attr("cx"))
            .attr("cy", neuron.attr("cy"))
            //.style("fill", neuron.style("fill"))
            .style("fill", targetColor)
            //.style("stroke", neuron.style("fill"))
            .style("fill-opacity", 1)
            //.style("stroke-opacity", 1)
            .style("pointer-events", "none");
        return pulseCircle;
    };

    let pulseCircle;
    neurons.filter(d => isNeuronTarget(d.data.neuron_id))
            .each(function() {
                const neuron = d3.select(this);
                pulseCircle = createPulseCircle(neuron);});
    
    const radius = pulseCircle.attr("r");

    const pulseAnimation = () => {
        pulseCircle.transition()
            .duration(pulseDuration)
            .ease(d3.easeCircleOut)
            .attr("r", radius * pulseAmplitude)
            .style("fill-opacity", 0)
            .transition()
            .duration(0)
            .attr("r", radius)
            .style("fill-opacity", 1)
            .on("end", pulseAnimation);
    };
    // ----- End of target code -----
    
    initializeZoom();

    // Filter out neurons below the cutoff value and hide them
    filterSvgByClusterDistCutoff();
    
    pulseAnimation(); // Start the animation
    setUpColorBar();
    updateVisualizationBySelection();
    setUpMainInfoSymbolAndInfoBox();
    openCollapsiblesAtInit();
}

function filterSvgByClusterDistCutoff() {
    const cutoff = parseInt(sliderClusterDistCutoff.value) + 1;

    circles.style("display", d => {
        if ((d.depth <= cutoff && !(d.parent == currentZoomedNode)) 
            || d.parent == currentZoomedNode
            || d == currentZoomedNode) {
            return "block";
        } else {
            return "none";
        }
    });

    clusters.style("fill", d => clusterCmap(d, true));
}

function filterSvgByZoomedNode() {
    const cutoff = parseInt(sliderClusterDistCutoff.value) + 1;

    /** The cluster or neuron should be displayed if: 
        1. it is the current zoomed node
        2. the parent is the current zoomed node
        3. it is a sibling of the current zoomed node
        4. it is one of the ancestors of the zoomed node
        5. it is smaller than or at the cutoff
    */
    circles.style("display", d => {
        if (d === currentZoomedNode 
            || d.parent == currentZoomedNode 
            || (currentZoomedNode.parent 
                && currentZoomedNode.parent.children 
                && currentZoomedNode.parent.children.includes(d))
            || currentZoomedNode.ancestors().includes(d)
            || d.depth <= cutoff) {
            return "block";
        } else {
            return "none";
        }
    });
    
    clusters.style("fill", d => clusterCmap(d));
}

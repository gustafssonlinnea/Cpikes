const renderNeuralNetwork = (neuronsPerLayer) => {
    // Define parameters
    const numLayers = neuronsPerLayer.length;

    // Set up SVG dimensions
    let height = 20; 
    let width = 200;
    const neuronRadius = 2.5;
    const maxNumNeurons = 20;
    const numberOfDots = 3;
    const dotSpace = numberOfDots * 2 + 1;
    const maxNumNeuronsSpace = maxNumNeurons + dotSpace;
    const margin = 5;

    const hSpaceNeededForNeurons = numLayers * neuronRadius * 2;
    const vSpaceNeededForNeurons = (maxNumNeuronsSpace) * neuronRadius * 2;

    if (margin < neuronRadius / 2) {
        margin = neuronRadius / 2;
    }

    if (width < 2 * margin + hSpaceNeededForNeurons) {
        width = 2 * margin + hSpaceNeededForNeurons;
    }

    if (height < 2 * margin + vSpaceNeededForNeurons) {
        height = 2 * margin + vSpaceNeededForNeurons;
    }

    const availableWidth = width - margin * 2;
    const availableHeight = height - margin * 2;
    const layerSpacing = availableWidth / (numLayers - 1);
    const verticalSpacing = (availableHeight - vSpaceNeededForNeurons) / (maxNumNeuronsSpace - 1);

    d3.select("#neural-network").html("");  // Remove any existing plot

    // Create SVG container
    const svgNN = d3.select("#neural-network")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const drawConnection = (x1, x2, y1, y2) => {
        svgNN.append("line")
            .attr("class", "snn-connection")
            .attr("x1", x1)
            .attr("y1", y1)
            .attr("x2", x2)
            .attr("y2", y2);
    };

    const drawNeuron = (x, y) => {
        svgNN.append("circle")
            .attr("class", "snn-neuron")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", neuronRadius);
    };

    // Draw connections
    for (let layer = 0; layer < numLayers - 1; layer++) {
        let numNeuronsCurrentLayer = neuronsPerLayer[layer];
        let numNeuronsNextLayer = neuronsPerLayer[layer + 1];
        const numNeuronSpacesCurrentLayer = numNeuronsCurrentLayer > maxNumNeurons ? 
            maxNumNeuronsSpace : numNeuronsCurrentLayer;
        const numNeuronSpacesNextLayer = numNeuronsNextLayer > maxNumNeurons ? 
            maxNumNeuronsSpace : numNeuronsNextLayer;
        const x1 = margin + layerSpacing * layer; // Current layer x
        const x2 = margin + layerSpacing * (layer + 1); // Next layer x

        for (let neuronCurr = 0; neuronCurr < numNeuronSpacesCurrentLayer; neuronCurr++) {
            const y1 = margin 
                + (availableHeight - numNeuronSpacesCurrentLayer * (neuronRadius * 2 + verticalSpacing)) 
                / 2 + neuronCurr * (neuronRadius * 2 + verticalSpacing);

            if (numNeuronsCurrentLayer <= maxNumNeurons) {
                for (let neuronNext = 0; neuronNext < numNeuronSpacesNextLayer; neuronNext++) {
                    const y2 = margin 
                        + (availableHeight 
                            - numNeuronSpacesNextLayer * (neuronRadius * 2 + verticalSpacing)
                        ) 
                        / 2 + neuronNext * (neuronRadius * 2 + verticalSpacing);

                    if (
                        numNeuronsNextLayer <= maxNumNeurons 
                        || (neuronNext < maxNumNeurons / 2 
                        || neuronNext >= maxNumNeurons / 2 + dotSpace)
                    ) {
                        drawConnection(x1, x2, y1, y2);
                    }
                }
            } else {
                if (neuronCurr < maxNumNeurons / 2 || neuronCurr >= maxNumNeurons / 2 + dotSpace) {
                    for (let neuronNext = 0; neuronNext < numNeuronSpacesNextLayer; neuronNext++) {
                        const y2 = margin 
                            + (availableHeight 
                                - numNeuronSpacesNextLayer * (neuronRadius * 2 + verticalSpacing)
                            ) 
                            / 2 + neuronNext * (neuronRadius * 2 + verticalSpacing);

                        if (
                            numNeuronsNextLayer <= maxNumNeurons 
                            || (neuronNext < maxNumNeurons / 2 
                            || neuronNext >= maxNumNeurons / 2 + dotSpace)
                        ) {
                            drawConnection(x1, x2, y1, y2);
                        }
                    }
                }
            }
        }
    }

    // Draw neurons
    for (let layer = 0; layer < numLayers; layer++) {
        let numNeurons = neuronsPerLayer[layer];
        const x = margin + layerSpacing * layer; // Spread neurons horizontally
        const numNeuronSpaces = numNeurons > maxNumNeurons ? maxNumNeuronsSpace : numNeurons;

        for (let neuron = 0; neuron < numNeuronSpaces; neuron++) {
            const y = margin 
                + (availableHeight - numNeuronSpaces * (neuronRadius * 2 + verticalSpacing)) 
                / 2 + neuron * (neuronRadius * 2 + verticalSpacing);

            if (
                numNeurons <= maxNumNeurons 
                || (neuron < maxNumNeurons / 2 
                || neuron >= maxNumNeurons / 2 + dotSpace)
            ) {
                    drawNeuron(x, y);
            } else {
                if (
                    neuron === Math.ceil(maxNumNeurons / 2) + 1 
                    || neuron === Math.ceil(maxNumNeurons / 2) + 3
                    || neuron == Math.ceil(maxNumNeurons / 2) + 5
                ) {
                    // Draw dot
                    svgNN.append("circle")
                        .attr("class", "snn-dot")
                        .attr("cx", x)
                        .attr("cy", y)
                        .attr("r", neuronRadius / 2);
                } 
            }
        }
    }
}

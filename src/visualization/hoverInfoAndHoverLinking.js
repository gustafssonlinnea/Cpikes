function hoverAncestors(neuronId, cluster = false, dehover = false) {
    let ancestors;

    if (!cluster) {
        ancestors = neurons.filter(d => d.data.neuron_id == neuronId)
            .data()
            .map(d => d.ancestors())
            .flat()
            .slice(1);
    } else {
        ancestors = clusters.filter(d => d.data.neuron_id == neuronId)
            .data()
            .map(d => d.ancestors())
            .filter(d => d.neuron_id != neuronId)
            .flat()
            .slice(1);
    }
    
    if (!dehover) {
        clusters.filter(d => ancestors.includes(d))
            .style("stroke-dasharray", d => getDashSize(d))
            .style("stroke", hoverStrokeColor)
            .style("stroke-width", d => clusterHoverStrokeWidth(d));
    } else {
        clusters.filter(d => ancestors.includes(d))
            .style("stroke-dasharray", updateStrokeStyle)
            .style("stroke", updateStrokeColor)
            .style("stroke-width", updateStrokeWidth);
    }
}

function handleMouseOverLinking() {
    // Get the neuron IDs of the hovered element
    const neuronIds = d3.select(this).attr("id").split("-");

    neuronIds.forEach(neuronId => {
        hoverAncestors(neuronId);
    });

    const hoverInfoContainer = d3.select("#hover-info-container");
    const tooltipHtml = getNeuronHoverInfo(neuronIds);
    hoverInfoContainer.html(tooltipHtml).style("border-color", hoverStrokeColor);

    if (neuronIds.length == 1 || (neuronIds.length == 2 && neuronIds[0] == neuronIds[1])) {
        const neuronId = neuronIds[0];
        const spikeTrain = [networkHashtable[neuronId].spike_trains];
        const potential = [networkHashtable[neuronId].potential_series];
        spikeRasterAndPotentialOverTime(spikeTrain, potential);
    }

    const neuronElements = document.getElementsByClassName("neuron");
    const neuronLineElements = [];
    let loweredLineOpacity = false;

    for (let i = 0; i < neuronElements.length; i++) {
        const neuronElement = neuronElements[i];
        const currId = neuronElement.id.split("-");

        neuronIds.forEach(neuronId => {
            if (currId.includes(neuronId)) {
                if (neuronElement.classList.contains("cpikes-neuron")) {
                    d3.select(neuronElement)
                        .style("stroke", hoverStrokeColor)
                        .style("stroke-width", updateStrokeWidth);
                    neuronElement.classList.add("glow");

                } else if (neuronElement.classList.contains("potential-plot-line")) {
                    neuronLineElements.push(neuronElement);
                    if (!loweredLineOpacity) {
                        const elements = document.getElementsByClassName("potential-plot-line");
                        for (let i = 0; i < elements.length; i++) {
                            elements[i].classList.add("low-stroke-opacity");
                        }
                        loweredLineOpacity = true;
                    }
                    

                } else if (neuronElement.classList.contains("cell")) {
                    neuronElement.querySelector("rect").classList.add("cellrect-hovered");

                } else if (neuronElement.classList.contains("heatmap")) {
                    neuronElement.classList.add("heatmaprect-hovered");
                }
            }
        });
    }

    neuronLineElements.forEach(neuronLineElement => {
        d3.select(neuronLineElement).remove();
        svgPotentials.append(() => d3.select(neuronLineElement).node());
        neuronLineElement.classList.add("potential-plot-line-hovered");
    });
}


function handleMouseOutLinking() {
    const neuronIds = d3.select(this).attr("id").split("-"); // Get the neuron IDs of the hovered element

    neuronIds.forEach(neuronId => {
        hoverAncestors(neuronId, false, true);
    });
    
    d3.select("#hover-info-container").html("").style("border-color", "transparent");
    
    const neuronElements = document.getElementsByClassName("neuron");

    for (let i = 0; i < neuronElements.length; i++) {
        const neuronElement = neuronElements[i];
        const currId = neuronElement.id.split("-");
        neuronIds.forEach(neuronId => {
            if (currId.includes(neuronId)) {
                if (neuronElement.classList.contains("cpikes-neuron")) {
                    d3.select(neuronElement).style("stroke", updateStrokeColor);
                    d3.select(neuronElement).style("stroke-width", updateStrokeWidth);
                    neuronElement.classList.remove("glow");

                } else if (neuronElement.classList.contains("potential-plot-line")) {
                    const elements = document.getElementsByClassName("potential-plot-line");
                    for (let i = 0; i < elements.length; i++) {
                        elements[i].classList.remove("low-stroke-opacity");
                    }
                    neuronElement.classList.remove("potential-plot-line-hovered");

                } else if (neuronElement.classList.contains("cell")) {
                    neuronElement.querySelector("rect").classList.remove("cellrect-hovered");
                
                } else if (neuronElement.classList.contains("heatmap")) {
                    neuronElement.classList.remove("heatmaprect-hovered");
                }
            }
        });
    }
}

function getNeuronHoverInfo(neuronIDs) {
    if (neuronIDs.length == 1 || (neuronIDs.length == 2 && neuronIDs[0] == neuronIDs[1])) {
        const neuronID = neuronIDs[0];
        const neuron = networkHashtable[neuronID];
        const headerText = isNeuronTarget(neuronID) ? "Neuron (target)" : "Neuron";

        const tooltipHtml = `\
            <p class="tooltip-header">${headerText}</p>
            <div class="tooltip-section">
                <div class="tooltip-neuron-container">
                    <svg class="tooltip-neuron" width="${neuronCenter * 2}" height="${neuronCenter * 2}">
                        <circle cx="${neuronCenter}" cy="${neuronCenter}" r="${neuronRadius}" fill="${neuronCmap(neuron.firing_rate)}" class="drop-shadow"></circle>
                    </svg>
                </div>
                <div class="table-hover-info-container">
                    <table class="table-dashboard table-hover-info">
                        <tr>
                            <td>Neuron ID</td>
                            <td>${neuronID}</td>
                        </tr>
                        <tr>
                            <td>Layer number</td>
                            <td>${neuron.layer_num}</td>
                        </tr>
                        <tr>
                            <td>Neuron number</td>
                            <td>${neuron.neuron_num}</td>
                        </tr>
                        <tr>
                            <td>Firing rate</td>
                            <td>${roundIfDecimals(neuron.firing_rate)}</td>
                        </tr>
                        <tr>
                            <td>Distance to target</td>
                            <td>${neuron.dtw_dist_to_target}</td>
                        </tr>
                    </table>
                </div>
            </div>
            <div id="neuron-spike-raster" class="spike-raster"></div>`;

            return tooltipHtml;
    } else {
        const neuronID0 = neuronIDs[0];
        const neuronID1 = neuronIDs[1];
        const neuron0 = networkHashtable[neuronID0];
        const neuron1 = networkHashtable[neuronID1];

        const tooltipHtml = `\
            <p class="tooltip-header">Neuron pair</p>
            <div class="tooltip-section">
                <div class="tooltip-neuron-container">
                    <svg class="tooltip-neuron" width="${neuronCenter * 2}" height="${neuronCenter * 2}">
                        <circle cx="${neuronCenter}" cy="${neuronCenter}" r="${neuronRadius}" fill="${neuronCmap(neuron0.firing_rate)}" class="drop-shadow"></circle>
                    </svg>
                </div>
                <div class="table-hover-info-container"></div>
                <div class="tooltip-neuron-container">
                    <svg class="tooltip-neuron" width="${neuronCenter * 2}" height="${neuronCenter * 2}">
                        <circle cx="${neuronCenter}" cy="${neuronCenter}" r="${neuronRadius}" fill="${neuronCmap(neuron1.firing_rate)}" class="drop-shadow"></circle>
                    </svg>
                </div>
                <div class="table-hover-info-container"></div>
            </div>
            <div class="tooltip-section-2">
                <table class="table-dashboard table-hover-info">
                    <tr>
                        <td>Neuron ID</td>
                        <td>${neuronID0}</td>
                    </tr>
                    <tr>
                        <td>Layer number</td>
                        <td>${neuron0.layer_num}</td>
                    </tr>
                    <tr>
                        <td>Neuron number</td>
                        <td>${neuron0.neuron_num}</td>
                    </tr>
                    <tr>
                        <td>Firing rate</td>
                        <td>${roundIfDecimals(neuron0.firing_rate)}</td>
                    </tr>
                    <tr>
                        <td>Distance to target</td>
                        <td>${neuron0.dtw_dist_to_target}</td>
                    </tr>
                </table>
                <table class="table-dashboard table-hover-info">
                    <tr>
                        <td>Neuron ID</td>
                        <td>${neuronID1}</td>
                    </tr>
                    <tr>
                        <td>Layer number</td>
                        <td>${neuron1.layer_num}</td>
                    </tr>
                    <tr>
                        <td>Neuron number</td>
                        <td>${neuron1.neuron_num}</td>
                    </tr>
                    <tr>
                        <td>Firing rate</td>
                        <td>${roundIfDecimals(neuron1.firing_rate)}</td>
                    </tr>
                    <tr>
                        <td>Distance to target</td>
                        <td>${neuron1.dtw_dist_to_target}</td>
                    </tr>
                </table>
            </div>
            <div class="tooltip-section-2">
                <div class="table-hover-info-container">
                    <table class="table-dashboard table-hover-info-neuron-dist">
                        <tr>
                            <td>Distance between neurons</td>
                            <td>${getDistBetweenNeurons(neuronID0, neuronID1)}</td>
                        </tr>
                    </table>
                </div>
            </div>`;
        return tooltipHtml;
    }
}

function getClusterHoverInfo(d) {
    const clusterNeuronIDs = d.data.neuron_id.split("-");
    const stats = calculateStats(clusterNeuronIDs);

    const tooltipHtml = `\
        <p class="tooltip-header">Cluster</p>
        <div class="tooltip-section">
            <div class="tooltip-neuron-container">
                <svg class="tooltip-neuron" width="${neuronCenter * 2}" height="${neuronCenter * 2}">
                    <circle cx="${neuronCenter}" cy="${neuronCenter}" r="${neuronRadius}" fill="${fillColor}" class="cluster"></circle>
                </svg>
            </div>
            <div class="table-hover-info-container">
                <table class="table-dashboard table-hover-info">
                    <tr>
                        <td>Number of neurons</td>
                        <td>${stats.generalStats.numNeurons}</td>
                    </tr>
                    <tr>
                        <td>Layers included</td>
                        <td>${stats.generalStats.includedLayers}</td>
                    </tr>
                    <tr>
                        <td>Cluster distance</td>
                        <td>${roundIfDecimals(d.data.value)}</td>
                    </tr>
                </table>
            </div>
        </div>
        <div class="tooltip-section-2">
            <table id="firing-rate-table" class="table-dashboard">
                <caption>Firing rate</caption>
                <tr>
                    <td>Mean, <i>&mu;</i></td>
                    <td>${stats.firingRateStats.mean}</td>
                </tr>
                <tr>
                    <td>Std. dev., <i>&sigma;</i></td>
                    <td>${stats.firingRateStats.stdDev}</td>
                </tr>
                <tr>
                    <td>Median</td>
                    <td>${stats.firingRateStats.median}</td>
                </tr>
                <tr>
                    <td>Min</td>
                    <td>${stats.firingRateStats.min}</td>
                </tr>
                <tr>
                    <td>Max</td>
                    <td>${stats.firingRateStats.max}</td>
                </tr>
            </table>
            <table id="dist-to-target-table" class="table-dashboard">
                <caption>Distance to target</caption>
                <tr>
                    <td>Mean, <i>&mu;</i></td>
                    <td>${stats.distToTargetStats.mean}</td>
                </tr>
                <tr>
                    <td>Std. dev., <i>&sigma;</i></td>
                    <td>${stats.distToTargetStats.stdDev}</td>
                </tr>
                <tr>
                    <td>Median</td>
                    <td>${stats.distToTargetStats.median}</td>
                </tr>
                <tr>
                    <td>Min</td>
                    <td>${stats.distToTargetStats.min}</td>
                </tr>
                <tr>
                    <td>Max</td>
                    <td>${stats.distToTargetStats.max}</td>
                </tr>
            </table>
        </div>`;

        return tooltipHtml;
}

const setUpLinkingEventHandling = neuronElement => {
    neuronElement.addEventListener("mouseover", handleMouseOverLinking);
    neuronElement.addEventListener("mouseout", handleMouseOutLinking);
}

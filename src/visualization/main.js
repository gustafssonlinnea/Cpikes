/** TODO
 * Enable zooming to neurons (with padding around them)
 * Make styles of neurons dynamic (drop-shadow size depending on radius)
 */

/* Potentially for future implementations
let metricDict = {
    "DTW": "DTW-distance",
    "ISI": "ISI-distance",
    "SPIKE-d": "SPIKE-distance",
    "SPIKE-s": "SPIKE-synchonization"
};

let cutoff = 0;  // If wanting to use different levels in the actual hierarchy data
*/

let testInput = 0;
let metric = "DTW";

const processedDataPath = "/processedData"

// If using all models
//const fileNamesPath = `${processedDataPath}/modelFileNames.json`;

// If using a smaller list 
// (customize modelFileNamesSmall.json so it matches what you exported in src/data_prep/main.py)
const fileNamesPath = `${processedDataPath}/modelFileNamesSmall.json`;

let modelPath;
let inputImagePath;
let networkPath;
let hierarchyPath;
let networkMetaDataPath;
let testInputMetaDataPath;
let distanceMatrixPath;

// TODO: Doesn't need to be initialized as [] when the TODO at the top of selection.js is done
let selectedNeurons = [];

let neuronIDToNodeID;
let nodeIDToNeuronID;
let selectedClusters = {};
let selectedChildrenClusters = {};

// The used data is always dense using the current data, 
// but this may be changed if other data is used (spikeTrainEncoding should then be made dynamic)
let spikeTrainEncoding = "Dense";  

let spikeTrains;
let potentials;

let networkMetaDataVar;
let testInputMetaDataVar;
let networkVar;
let hierarchyVar;
let distanceMatrixVar;

let networkHashtable;

let maxSpikeCount;
const sliderTargetDissim = document.getElementById("slider-range-target-dissim");
const sliderValueTargetDissim = document.getElementById("slider-value-target-dissim");
const sliderCutoff = document.getElementById("slider-range-cutoff");
const sliderValueCutoff = document.getElementById("slider-value-cutoff");
const sliderClusterDistCutoff = document.getElementById("slider-range-cluster-dist-cutoff");
const sliderValueClusterDistCutoff = document.getElementById("slider-value-cluster-dist-cutoff");

let currentZoomedNode = null;
let hoveredCluster = null;
let zoomInitialized = false;

let svg;
let g;
let circles;
let clusters;
let neurons;
let xSymbol;

let svgPotentials;

let init = true;

setUpCollapsiblesEventHandlers();

// Fetch the file names first
fetchFile(fileNamesPath)
    .then(fileNames => {
        // Populate select element with options
        const fileNameSelect = document.getElementById('networks');
        fileNames.sort();
        fileNames.forEach(fileName => {
            const option = document.createElement('option');
            option.value = fileName;
            option.textContent = fileName;
            fileNameSelect.appendChild(option);
        });

        fileNameSelect.addEventListener('change', (event) => {
            const selectedFileName = event.target.value;
            modelPath = `/${selectedFileName}`;
            fetchNetworkMetaData();
            testInput = 0;
        });

        // Trigger change event to initialize modelPath with the default value
        fileNameSelect.dispatchEvent(new Event('change'));
    })
    .catch(error => {
        console.error('Error fetching file names:', error);
    });

const fetchNetworkMetaData = () => {
    updatePathNames();
    fetchFile(networkMetaDataPath)
        .then(networkMetaData => {
            networkMetaDataVar = networkMetaData;

            const testInputSelect = document.getElementById('test-inputs');
            testInputSelect.innerHTML = '';  // Make sure selection element is cleared out
            
            for (let i = 0; i < networkMetaData.numTestInputs; i++) {
                fetchFile(`${processedDataPath}/testInputMetadata${modelPath}/testInputMetadataTestInput${i}.json`)
                    .then(testInputMetaDatai => {
                        testInputSelect.add(
                            new Option(
                                `Target: ${testInputMetaDatai.target}, Output: ${testInputMetaDatai.output.join(", ")}`, `${i}`
                            )
                        );
                    })
                    .catch(error => {
                        console.error('There was a problem with fetching the data:', error);
                    });
            }

            testInputSelect.addEventListener('change', (event) => {
                //const selectedTestInput = event.target.value;
                //testInput = selectedTestInput;
                testInput = event.target.value;;
                updatePathNames();
                fetchNetwork();
                fetchRemainingFiles();
            });

            const numNeuronsAcrossLayers = networkMetaData.numNeurons.reduce(
                (total, currentValue) => total + currentValue, 0
            );
            selectedNeurons = new Array(numNeuronsAcrossLayers).fill(false);        

            var elements = document.querySelectorAll('#selection-table');

            elements.forEach(function(element) {
                element.style.color = noSelectionStrokeColor;
            });

            document.getElementById("num-selected-neurons").innerHTML = 0;

            updatePathNames();
            fetchNetwork();
            fetchRemainingFiles();
            processAndRenderNetworkData();
        })
        .catch(error => {
            console.error('There was a problem with fetching the data:', error);
        });;
}

const fetchNetwork = () => {
    fetchFile(networkPath)
        .then(network => {
            networkVar = network;
            neuronIDToNodeID = createNeuronIDToNodeIDTable(network);
            nodeIDToNeuronID = createNodeIDToNeuronIDTable(network);
            networkHashtable = createHashtableFromJSONData(network);
        })
        .catch(error => {
            console.error('There was a problem with fetching the data:', error);
        });
}

// Function to fetch remaining files after getting the modelPath
const fetchRemainingFiles = () => {
    Promise.all([
        fetchFile(testInputMetaDataPath), 
        fetchFile(hierarchyPath), 
        fetchFile(distanceMatrixPath)
    ])
        .then(([
            testInputMetaData,
            hierarchy,
            distanceMatrix
        ]) => {
            testInputMetaDataVar = testInputMetaData;
            hierarchyVar = hierarchy;
            distanceMatrixVar = distanceMatrix.map(({ x, y, value }) => ({ x, y, value }));
            
            document.getElementById("loader").style.display = "none";
            document.getElementById("clear-button").style.display = "flex";

            sliderTargetDissim.max = testInputMetaData.maxDtwDistToTarget;
            sliderTargetDissim.value = sliderTargetDissim.max;
            sliderValueTargetDissim.innerHTML = sliderTargetDissim.value; 

            processAndRenderTestInputData();
            processAndRenderData();
        })
        .catch(error => {
            console.error('There was a problem with fetching the data:', error);
        });
}

function setUpCollapsiblesEventHandlers() {
    const collapsibles = document.getElementsByClassName("collapsible");

    for (let i = 0; i < collapsibles.length; i++) {
        collapsibles[i].addEventListener("click", function() {
            const isActive = this.classList.contains("active");
            this.classList.toggle("active");
            
            if (isActive) {
                setTimeout(() => {
                    this.style.borderRadius = "var(--border-radius)";
                }, parseFloat(collapsibleTransitionTime) * 1000);
            } else {
                this.style.borderRadius = "var(--border-radius) var(--border-radius) 0 0";
            }

            const content = this.nextElementSibling;
            if (content.style.maxHeight){
                content.style.maxHeight = null;
            } else {
                // Check if the current collapsible is the one needing specific height
                if (this.id === "hover-info-toggle") {
                    // Set specific height for this element
                    content.style.maxHeight = `${parseInt(hoverInfoHeight) + parseInt(padding) * 4}px`;
                } else {
                    content.style.maxHeight = content.scrollHeight + "px"; // Use scrollHeight for other collapsibles
                }
            } 
        });
    }
}

const openCollapsiblesAtInit = () => {
    if (init) {
        const collapsibles = document.getElementsByClassName("collapsible");

        for (let i = 0; i < collapsibles.length; i++) {
            collapsibles[i].click();  // Initialize as open
        }
        init = false;
    }
}

// Tooltip timeouts variables
let tooltipTimeout, hideTooltipTimeout;

// Flag to track tooltip display status
let tooltipDisplayed = false;

// Function to show tooltip after 1 second of hovering
const showTooltipAfterDelay = () => {
    console.log("showTooltipAfterDelay() called");
    if (tooltipDisplayed || tooltipTimeout) {
        console.log("Tooltip already displayed or scheduled");
        return;
    }

    // Set the flag indicating the tooltip is scheduled
    tooltipTimeout = setTimeout(function() {
        // Clear the timeout variable
        tooltipTimeout = null;

        // Get the bounding box of the zoomButtonGroup relative to the page
        const boundingBox = zoomButtonGroup.node().getBoundingClientRect();
        const x = boundingBox.left;
        const y = boundingBox.top;

        console.log("Group coordinates:", x, y); // Debugging message

        // Set tooltip position near the button
        const tooltip = d3.select("#zoom-tooltip");
        if (!tooltip.empty()) {
            tooltip
                .style("left", (x + 10) + "px")
                .style("top", (y + 20) + "px")
                .style("display", "block")
                .text("Zooming into clusters is also enabled by double-clicking");

            // Set flag indicating the tooltip is displayed
            tooltipDisplayed = true;

            // Clear any existing hide timeout
            clearTimeout(hideTooltipTimeout);

            // Set timeout to remove tooltip after 10 seconds
            hideTooltipTimeout = setTimeout(function() {
                // Clear the hide timeout and reset flags
                hideTooltipTimeout = null;
                tooltip.style("display", "none");
                tooltipDisplayed = false;
            }, 10000);
        } else {
            console.log("Tooltip element not found"); // Debugging message
        }
    }, 1000);
}

// Function to hide tooltip
const hideTooltip = () => {
    // Clear both timeouts
    clearTimeout(tooltipTimeout);
    clearTimeout(hideTooltipTimeout);

    // If tooltip is scheduled to show, cancel it
    if (tooltipTimeout) {
        tooltipTimeout = null;
        console.log("Tooltip scheduled to show, but cursor moved out of button area");
    }

    // If tooltip is currently displayed, hide it
    if (tooltipDisplayed) {
        // Remove tooltip
        d3.select("#zoom-tooltip").style("display", "none");
        tooltipDisplayed = false; // Update tooltip display status
    }
}

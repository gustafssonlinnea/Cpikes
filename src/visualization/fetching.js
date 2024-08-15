const fetchFile = async (path) => {
    // TODO: Move the code below (potentially to processAndRenderData.js)? Not actually part of the fetching
    // Reload page
    d3.select("#cpikes").html("");  // Clear out potential previous plot
    document.getElementById("clear-button").style.display = "none";
    document.getElementById("loader").style.display = "flex";
    d3.select("#color-bar").html("");
    // End of TODO

    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${path}`, error);
        throw error; // Re-throw the error to be caught later
    }
};

const updatePathNames = () => {
    inputImagePath = `${processedDataPath}/exportedGIFs${modelPath}/testInput${testInput}.gif`;
    networkPath = `${processedDataPath}/networks${modelPath}/networkTestInput${testInput}.json`;
    hierarchyPath = `${processedDataPath}/hierarchies${modelPath}/${metric}/${metric}HierarchyTestInput${testInput}.json`;
    networkMetaDataPath = `${processedDataPath}/networkMetaData${modelPath}/networkMetadataTestInput${testInput}.json`;
    testInputMetaDataPath = `${processedDataPath}/testInputMetadata${modelPath}/testInputMetadataTestInput${testInput}.json`;
    distanceMatrixPath = `${processedDataPath}/distanceMatrices${modelPath}/${metric}/${metric}DistMatrixTestInput${testInput}.json`;
}

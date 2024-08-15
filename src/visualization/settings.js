const setUpClusterDepthCutoff = (nodes) => {
    // Cutoff for choosing which neurons to hide and which clusters to color according to firing rate
    sliderClusterDistCutoff.max = d3.max(nodes, d => d.depth) - 1;
    sliderClusterDistCutoff.value = 0;
    sliderValueClusterDistCutoff.innerHTML = sliderClusterDistCutoff.value; 

    sliderClusterDistCutoff.addEventListener('input', () => {
        // Update cutoff value
        sliderValueClusterDistCutoff.innerHTML = sliderClusterDistCutoff.value; 
        filterSvgByClusterDistCutoff();
    });
}

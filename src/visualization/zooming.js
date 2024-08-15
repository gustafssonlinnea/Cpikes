const zoomDuration = 750;
const zoomIdentityScale = 0.97;  // If set to 1, there is no padding around the root circle


const createXSymbol = () => {
    // Create the X-mark symbol SVG element
    xSymbol = svg.append("g")
        .attr("class", "x-symbol");

    // Append the lines to create the X-mark
    xSymbol.append("rect") // Transparent rectangle to capture click events
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 40)
        .attr("height", 40);

    xSymbol.append("line")
        .attr("class", "x-line")
        .attr("x1", 10)
        .attr("y1", 10)
        .attr("x2", 30)
        .attr("y2", 30)
        .style("stroke", xColor);

    xSymbol.append("line")
        .attr("class", "x-line")
        .attr("x1", 30)
        .attr("y1", 10)
        .attr("x2", 10)
        .attr("y2", 30)
        .style("stroke", xColor);
}

document.addEventListener("keydown", function(event) {
    // Check if the pressed key is the "Escape" key
    if (event.key === "Escape") {
        resetZoom();
        toggleXSymbolVisibility(false);   
    }
});

const zoomToNode = node => {
    currentZoomedNode = node;
    const k = width / (node.r * 2 + focusStrokeWidth(node));
    const view = [node.x, node.y, node.r * 2 + focusStrokeWidth(node)];
    svg.style("pointer-events", "none");
    filterSvgByZoomedNode();
    circles.style("stroke", updateStrokeColor);
    circles.style("stroke-width", updateStrokeWidth);
    svg.transition()
        .duration(zoomDuration)
        .call(zoom.transform, d3.zoomIdentity
                                .translate(width / 2, height / 2).scale(k)
                                .translate(-view[0], -view[1]))
        .on("end", () => {
            svg.style("pointer-events", "all"); // Enable pointer events after transition
        });
}

const resetZoom = () => {
    toggleXSymbolVisibility(false); // Hide the X-mark symbol
    currentZoomedNode = null;
    filterSvgByClusterDistCutoff();
    circles.style("stroke", updateStrokeColor);
    circles.style("stroke-width", updateStrokeWidth);
    const zoomIdentityMargin = 20;
    const view = [width / 2, height / 2, width + zoomIdentityMargin];
    svg.transition()
        .duration(zoomDuration)
        .call(zoom.transform, d3.zoomIdentity
            .translate(width / 2, height / 2).scale(zoomIdentityScale)
            .translate(-view[0], -view[1]));
}

const initializeZoom = () => {
    toggleXSymbolVisibility(false); // Hide the X-mark symbol
    currentZoomedNode = null;
    filterSvgByClusterDistCutoff();
    circles.style("stroke", updateStrokeColor);
    circles.style("stroke-width", updateStrokeWidth);
    const zoomIdentityMargin = 20;
    const view = [width / 2, height / 2, width + zoomIdentityMargin];
    svg.transition()
        .duration(0)
        .call(zoom.transform, d3.zoomIdentity
            .translate(width / 2, height / 2).scale(zoomIdentityScale)
            .translate(-view[0], -view[1]));
    if (!zoomInitialized) {zoomInitialized = true};
}

const toggleZoom = node => {
    if (currentZoomedNode === node) {
        resetZoom();
    } else if (node.children) {
        zoomToNode(node);
        toggleXSymbolVisibility(true); // Show the X-mark symbol when zoomed in
    }
}

const toggleXSymbolVisibility = visible => {
    xSymbol.style("visibility", visible ? "visible" : "hidden");
}

// Function to show the zoom button
const showZoomButton = () => {
    zoomButtonGroup.style("display", "block");
}

// Function to hide the zoom button
const hideZoomButton = () => {
    zoomButtonGroup.style("display", "none");
}

const zoomed = event => {
    // Check if the view is zoomed (scale is not equal to zoomIdentityScale) 
    const isZoomed = event.transform.k !== zoomIdentityScale;

    // Toggle the visibility of the X-mark based on the zoom and initialization states
    zoomInitialized? toggleXSymbolVisibility(isZoomed) : toggleXSymbolVisibility(false);

    g.attr("transform", event.transform);

    circles.style("stroke", updateStrokeColor);
    circles.style("stroke-width", updateStrokeWidth);
}

const zoom = d3.zoom()
    .scaleExtent([1, 16])  // TODO: Max scale (second list element) should be dynamic
    .on("zoom", zoomed);

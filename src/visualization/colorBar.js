function setUpColorBar() {
    // Set the dimensions and margins of the color bar
    const widthColorBar = 16;
    const heightColorBar = 340;
    const margin = { top: 20, right: 20, bottom: 20, left: 40 };

    // Select div and make sure it's empty
    const containerDiv = d3.select("#color-bar");
    containerDiv.html("");

    // Append the SVG to the selected div
    const svg = containerDiv
        .append("svg")
        .attr("width", widthColorBar + margin.left + margin.right)
        .attr("height", heightColorBar + margin.top + margin.bottom);

    // Append a color bar rectangle
    svg.append("rect")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", widthColorBar)
        .attr("height", heightColorBar)
        .attr("fill", "url(#colorGradient)")
        .attr("class", "color-bar-shadow");

    // Append a color gradient to the SVG
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "colorGradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");
    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", neuronColorRange[0]);
    linearGradient.append("stop")
        .attr("offset", "25%")
        .attr("stop-color", neuronColorRange[1]);
    linearGradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", neuronColorRange[2]);
    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", neuronColorRange[3]);

    // Create custom ticks
    const ticks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
    const tickLabels = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 1];

    // Append ticks
    svg.selectAll(".tick")
        .data(ticks)
        .enter()
        .append("line")
        .attr("class", "tick color-bar-items")
        .attr("x1", margin.left - 5) // Adjust the position for vertical layout
        .attr("y1", function (d) {
            return margin.top + heightColorBar * (1 - calculateColorValue(d));
        }) // Adjust the position for vertical layout
        .attr("x2", margin.left) // Adjust the position for vertical layout
        .attr("y2", function (d) {
            return margin.top + heightColorBar * (1 - calculateColorValue(d));
        }) // Adjust the position for vertical layout
        .attr("stroke", axisDefaultColor);

    // Append tick labels
    svg.selectAll(".tick-label")
        .data(tickLabels)
        .enter()
        .append("text")
        .attr("class", "tick-label color-bar-items")
        .attr("x", margin.left - 10) // Adjust the position for vertical layout
        .attr("y", function (d) {
            return margin.top + heightColorBar * (1 - calculateColorValue(d));
        }) // Adjust the position for vertical layout
        .attr("text-anchor", "end") // Align text to the end
        .attr("alignment-baseline", "middle") // Align text to the middle
        .text(function (d) { return d; });

    // Append "Firing rate" text
    svg.append("text")
        .attr("class", "color-bar-items")
        .attr("x", margin.left + widthColorBar + 14) // Position beside the color bar
        .attr("y", margin.top + heightColorBar / 2) // Position vertically centered
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .html('Firing rate <span title="The firing rate is calculated as number of spikes divided by number of time steps." class="info-symbol">&#9432;</span>')
        .attr("writing-mode", "vertical-rl"); // Rotate text vertically using CSS
}

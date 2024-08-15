const xAxisDistance = 10;
const yAxisDistance = 10;

 // TODO: midPadding should be used where subVisMargin.top is used, since one cannot set top: midPadding 
const subVisMargin = { top: 18, right: 20, bottom: 50, left: 80 };

const rasterColors = ["rgba(0, 0, 0, 0.1)", "white"];
const xPadding = 0.2;
const yPadding = 0.2;
const subVisWidth = 360;
const subVisHeight = 260;

function getAxisColor() {
    return getNumSelectedNeurons() == 0 ? noSelectionStrokeColor : axisDefaultColor
};

const spikeRaster = (
        allSpikeTrains, 
        rasterID = "#spike-raster", 
        width = subVisWidth, 
        height = subVisHeight, 
        yLabel = "neuron"
    ) => {
    d3.select(rasterID).html("");  // Remove any existing plot

    // Set up SVG dimensions
    const innerWidth = width - subVisMargin.left - subVisMargin.right;
    const innerHeight = height - subVisMargin.top - subVisMargin.bottom;

    const colorScale = d3.scaleLinear()
        .domain([0, maxSpikeCount])
        .range(rasterColors);

    // Define scales for x and y axes
    const xScale = d3.scaleBand()
        .domain(d3.range(testInputMetaDataVar.numTimeBins + networkMetaDataVar.numLayers + 1))
        .range([0, innerWidth])
        .padding(xPadding);

    const spikeTrains = getDataForSelectedNeurons(allSpikeTrains);
    const numSelectedNeurons = getNumSelectedNeurons();

    const axisColor = getAxisColor();
    
    const yScale = d3.scaleBand()
        .domain(d3.range(numSelectedNeurons))
        .range([innerHeight, 0])
        .padding(yPadding);

    const yScaleNeuronIDs = d3.scaleBand()
        .domain(getSelectedNeuronIDs())
        .range([innerHeight, 0])
        .padding(yPadding);

    // Create SVG container
    const svg = d3.select(rasterID)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${subVisMargin.left},${subVisMargin.top})`);

    const selectedNeuronIDs = getSelectedNeuronIDs();
        
    // Render cells
    const cells = svg.selectAll(".cell")
        .data(spikeTrains.flatMap((row, rowIndex) =>
            row.map((count, colIndex) => ({ rowIndex, colIndex, count }))
        ))
        .enter()
        .append("g")
        .attr("class", "cell neuron")
        .attr("id", d => selectedNeuronIDs[d.rowIndex])
        .attr("transform", d => `translate(${xScale(d.colIndex)},${yScale(d.rowIndex)})`);

    cells.append("rect")
        .attr("class", "cellrect")
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d.count));

    // Add x-axis
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickValues(xScale.domain().filter((_, i) => i % 5 === 0)))
        .attr("color", axisColor);

    // Create the y-axis
    const yAxis = d3.axisLeft(yScaleNeuronIDs);
    
    // Add y-axis
    if (numSelectedNeurons <= 12) {
        svg.append("g")
            .attr("class", "y-axis")
            .call(yAxis)
            .attr("color", axisColor);
    } else {
        svg.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yScale).tickValues(yScale.domain().filter((_, i) => i === -1)))
            .attr("color", axisColor);  // TODO: Ugly solution with i === -1, should be fixed
    }

    svg.append("text")
        //.attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", innerWidth)
        .attr("y", innerHeight + subVisMargin.bottom - xAxisDistance)
        .text("time (time step bins)")
        .style("fill", axisColor);
    
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", yAxisDistance - subVisMargin.left)
        .attr("dy", ".75em")
        .text(yLabel)
        .style("fill", axisColor);
}

const potentialOverTime = (
        allPotentials, id = "#potential-plot", 
        width = subVisWidth, 
        height = subVisHeight
    ) => {
    d3.select(id).html("");  // Remove any existing plot

    const potentials = getDataForSelectedNeurons(allPotentials);
    const neuronCount = potentials.length;
    const innerWidth = width - subVisMargin.left - subVisMargin.right;
    const innerHeight = height - subVisMargin.top - subVisMargin.bottom;
    
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const svg = d3.select(id).append("svg")
        .attr("width", innerWidth + subVisMargin.left + subVisMargin.right)
        .attr("height", innerHeight + subVisMargin.top + subVisMargin.bottom)
        .append("g")
        .attr("transform", "translate(" + subVisMargin.left + "," + subVisMargin.top + ")");

    // Flatten the potentials list of lists
    const flattenedPotentials = potentials.flat();

    // Find the minimum value
    const minPotential = Math.min(...flattenedPotentials);

    // Find the maximum value
    const maxPotential = Math.max(...flattenedPotentials);

    const x = d3.scaleLinear()
        .domain([0, testInputMetaDataVar.numTimeBins + networkMetaDataVar.numLayers + 1])
        .range([0, innerWidth]);
    const y = d3.scaleLinear()
        .domain([minPotential, maxPotential])
        .range([innerHeight, 0]);

    const line = d3.line()
        .x(function(_, i) { return x(i); })
        .y(function(d) { return y(d); });

    const selectedNeuronIDs = getSelectedNeuronIDs();
    const axisColor = getAxisColor();

    for (let i = 0; i < neuronCount; i++) {
        svg.append("path")
            .datum(potentials[i])
            .attr("class", "potential-plot-line neuron")
            .attr("d", line)
            .attr("id", selectedNeuronIDs[i])
            .style("stroke", colorScale(i))
            .style("stroke-width", 2);;
    }

    const numXTicks = Math.ceil(
        (testInputMetaDataVar.numTimeBins + networkMetaDataVar.numLayers + 1) / 5
    );
    const numYTicks = 5;

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x)
            .ticks(numXTicks))
        .selectAll("text")  // Select all text elements in the axis
        .style("fill", axisColor);

    // Add y-axis
    svg.append("g")
        .call(d3.axisLeft(y)
            .ticks(numYTicks))
        .selectAll("text")  // Select all text elements in the axis
        .style("fill", axisColor);;

    svg.selectAll(".domain, .tick line")  // Select the axis lines and tick lines
        .style("stroke", axisColor);

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", innerWidth)
        .attr("y", innerHeight + subVisMargin.bottom - xAxisDistance)
        .text("time (time step bins)")
        .style("fill", axisColor);
    
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", yAxisDistance - subVisMargin.left)
        .attr("dy", ".75em")
        .text("potential")
        .style("fill", axisColor);

    svgPotentials = svg;
}

const spikeRasterAndPotentialOverTime = (spikeTrains, potentials, rasterID = "#neuron-spike-raster", width = subVisWidth - 20, height = 130) => {
    d3.select(rasterID).html("");

    // Set up SVG dimensions
    const innerWidth = width - subVisMargin.left - subVisMargin.right;
    const innerHeight = height - subVisMargin.top - subVisMargin.bottom;

    const colorScaleRaster = d3.scaleLinear()
        .domain([0, maxSpikeCount])
        .range(rasterColors);

    // Define scales for x- and y-axes
    const xScale = d3.scaleBand()
        .domain(d3.range(testInputMetaDataVar.numTimeBins + networkMetaDataVar.numLayers + 1))
        .range([0, innerWidth])
        .padding(xPadding);
    
    const yScale = d3.scaleBand()
        .domain(d3.range(spikeTrains.length))
        .range([innerHeight, 0])
        .padding(xPadding);

    // Flatten the potentials list of lists
    const flattenedPotentials = potentials.flat();

    // Find the minimum value
    const minPotential = Math.min(...flattenedPotentials);

    // Find the maximum value
    const maxPotential = Math.max(...flattenedPotentials);

    const x = d3.scaleLinear()
        .domain([0, testInputMetaDataVar.numTimeBins + networkMetaDataVar.numLayers + 1])
        .range([0, innerWidth]);
    const y = d3.scaleLinear()
        .domain([minPotential, maxPotential])
        .range([innerHeight, 0]);

    // Create SVG container
    const svg = d3.select(rasterID)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${subVisMargin.left},${subVisMargin.top})`);

    // Render cells
    const cells = svg.selectAll(".cell")
        .data(spikeTrains.flatMap((row, rowIndex) =>
            row.map((count, colIndex) => ({ rowIndex, colIndex, count }))
        ))
        .enter().append("g")
        .attr("class", "cell")
        .attr("transform", d => `translate(${xScale(d.colIndex)},${yScale(d.rowIndex)})`);

    cells.append("rect")
        .attr("class", "cellrect")
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScaleRaster(d.count));

    svg.select("#potential-plot").append("svg")
        .attr("width", innerWidth + subVisMargin.left + subVisMargin.right)
        .attr("height", innerHeight + subVisMargin.top + subVisMargin.bottom)
        .append("g")
        .attr("transform", "translate(" + subVisMargin.left + "," + subVisMargin.top + ")");

    const line = d3.line()
        .x(function(_, i) { return x(i) + xScale.bandwidth() / 2; })
        .y(function(d) { return y(d); });

    svg.append("path")
        .datum(potentials[0])
        .attr("class", "potential-overlay-plot-line")
        .attr("d", line);

    const numYTicks = 3;

    // Add y-axis
    svg.append("g")
        .call(d3.axisLeft(y)
            .ticks(numYTicks));

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", innerWidth)
        .attr("y", innerHeight + subVisMargin.bottom - xAxisDistance)
        .text("time (time step bins)");

    // Add x-axis
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickValues(xScale.domain().filter((_, i) => i % 5 === 0)));
    
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", yAxisDistance - subVisMargin.left)
        .attr("dy", ".75em")
        .text("potential");
}

const distanceHeatmap = (
        distanceMatrix, 
        id = "#heatmap", 
        width = subVisWidth, 
        height = subVisWidth
    ) => {
    // Define dimensions and margins for the heatmap
    const margin = { top: midPadding, right: 20, bottom: 50, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = innerWidth;

    const padding = 0.15;

    const data = getMatrixDataForSelectedNeurons(distanceMatrix);

    const numSelectedNeurons = getNumSelectedNeurons();
    const axisColor = getAxisColor();

    d3.select(id).html(""); // Remove any existing plot

    // Create SVG element for the heatmap
    const svg = d3.select(id)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define scales for x- and y-axes
    const xScale = d3.scaleBand()
        .range([0, innerWidth])
        .domain(d3.range(numSelectedNeurons))
        .padding(padding);

    const selectedNeuronIDs = getSelectedNeuronIDs();

    const xScaleNeuronIDs = d3.scaleBand()
        .domain(selectedNeuronIDs)
        .range([0, innerWidth])
        .padding(padding);

    const yScale = d3.scaleBand()
        .domain(d3.range(numSelectedNeurons))
        .range([innerHeight, 0])
        .padding(padding);

    const yScaleNeuronIDs = d3.scaleBand()
        .domain(selectedNeuronIDs)
        .range([innerHeight, 0])
        .padding(padding);

    // Define color scale
    const colorScale = d3.scaleLinear()
        .domain([0, testInputMetaDataVar.numTimeBins])  // TODO: Make this so that it's the max possible distance, not only for DTW. Also, make sure to add extra (for the number of layers).
        .range(["black", "white"]);

    const handleMouseOver = function() {
        d3.select(this).classed("heatmaprect-hovered-main", true);
    };

    const handleMouseLeave = function() {
        d3.select(this).classed("heatmaprect-hovered-main", false);
    };
        
    // Draw rectangles for heatmap
    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.x))
        .attr("y", d => yScale(d.y))
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("class", "heatmap neuron")
        .attr("id", d => `${selectedNeuronIDs[d.x]}-${selectedNeuronIDs[d.y]}`)
        .style("fill", d => colorScale(d.value))
        .on("mouseover", handleMouseOver)
        .on("mouseleave", handleMouseLeave)
        .append("title")
        .text(d =>`${d.value}\n(between ${selectedNeuronIDs[d.x]} and ${selectedNeuronIDs[d.y]})`);

    const limit = 12;

    // Create the y-axis
    const xAxis = d3.axisBottom(xScaleNeuronIDs);
    const yAxis = d3.axisLeft(yScaleNeuronIDs);

    // Add y-axis
    if (numSelectedNeurons <= limit) {
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(xAxis)
            .attr("color", axisColor)
            .selectAll("text")
            .style("text-anchor", "start")
            .attr("dx", ".75em")
            .attr("dy", "-.375em")
            .attr("transform", "rotate(90)");

        svg.append("g")
            .attr("class", "y-axis")
            .call(yAxis)
            .attr("color", axisColor);
    } else {
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(xScale).tickValues(xScale.domain().filter((_, i) => i === -1)))
            .attr("color", axisColor);  // TODO: Ugly solution with i === -1, should be fixed

        svg.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yScale).tickValues(yScale.domain().filter((_, i) => i === -1)))
            .attr("color", axisColor);  // TODO: Ugly solution with i === -1, should be fixed
    }

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", yAxisDistance - margin.left)
        .attr("dy", ".75em")
        .text("neuron")
        .style("fill", axisColor);

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", innerWidth)
        .attr("y", innerHeight + margin.bottom + yAxisDistance + 20)
        .text("neuron")
        .style("fill", axisColor);
}

const getDataForSelectedNeurons = data => {
    const selectedData = selectedNeurons.reduce((acc, isSelected, index) => {
        if (isSelected) {
            acc.push(data[index]);
        }
        return acc;
    }, []);
    return selectedData;
}

const getMatrixDataForSelectedNeurons = (data) => {
    const selectedData = [];
    let i = 0;
    let j = 0;
    selectedNeurons.forEach((isSelectedRow, index1) => {
        if (isSelectedRow) {
            selectedNeurons.forEach((isSelectedColumn, index2) => {
                if (isSelectedColumn) {

                    const matrixElement1 = data.find(obj => obj.x === index2 && obj.y === index1);
                    selectedData.push({
                        x: i,
                        y: j,
                        value: matrixElement1.value
                    });
                    i++;
                }
            });
            j++;
            i = 0;
        }
    });

    return selectedData;
}

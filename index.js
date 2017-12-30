import * as d3 from 'd3';
//import dagreD3 from 'dagre-d3'

console.log(d3);
var workers = {
	"identifier": {
		"consumers": 2,
		"count": 20
	},
	"lost-and-found": {
		"consumers": 1,
		"count": 1,
		"inputQueue": "identifier",
		"inputThroughput": 50
	},
	"monitor": {
		"consumers": 1,
		"count": 0,
		"inputQueue": "identifier",
		"inputThroughput": 50
	},
	"meta-enricher": {
		"consumers": 4,
		"count": 9900,
		"inputQueue": "identifier",
		"inputThroughput": 50
	},
	"geo-enricher": {
		"consumers": 2,
		"count": 1,
		"inputQueue": "meta-enricher",
		"inputThroughput": 50
	},
	"elasticsearch-writer": {
		"consumers": 0,
		"count": 9900,
		"inputQueue": "geo-enricher",
		"inputThroughput": 50
	}
};

// Set up zoom support
var svg = d3.select("svg"),
	inner = svg.select("g"),
	zoom = d3.zoom().on("zoom", function() {
		inner.attr("transform", d3.event.transform);
	});
svg.call(zoom);

var render = new dagreD3.render();

// Left-to-right layout
var g = new dagreD3.graphlib.Graph();
g.setGraph({
			   nodesep: 70,
			   ranksep: 50,
			   rankdir: "LR",
			   marginx: 20,
			   marginy: 20
		   });

function draw(isUpdate) {
	for (var id in workers) {
		var worker = workers[id];
		var className = worker.consumers ? "running" : "stopped";
		if (worker.count > 10000) {
			className += " warn";
		}
		var html = "<div>";
		html += "<span class=status></span>";
		html += "<span class=consumers>"+worker.consumers+"</span>";
		html += "<span class=name>"+id+"</span>";
		html += "<span class=queue><span class=counter>"+worker.count+"</span></span>";
		html += "</div>";
		g.setNode(id, {
			labelType: "html",
			label: html,
			rx: 5,
			ry: 5,
			padding: 0,
			class: className
		});

		if (worker.inputQueue) {
			g.setEdge(worker.inputQueue, id, {
				label: worker.inputThroughput + "/s",
				width: 40
			});
		}
	}

	inner.call(render, g);

	// Zoom and scale to fit
	var graphWidth = g.graph().width + 80;
	var graphHeight = g.graph().height + 40;
	var width = parseInt(svg.style("width").replace(/px/, ""));
	var height = parseInt(svg.style("height").replace(/px/, ""));
	var zoomScale = Math.min(width / graphWidth, height / graphHeight);
	var translateX = (width / 2) - ((graphWidth * zoomScale) / 2)
	var translateY = (height / 2) - ((graphHeight * zoomScale) / 2);
	var svgZoom = isUpdate ? svg.transition().duration(500) : svg;
	svgZoom.call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(zoomScale));
}

// Do some mock queue status updates
setInterval(function() {
	var stoppedWorker1Count = workers["elasticsearch-writer"].count;
	var stoppedWorker2Count = workers["meta-enricher"].count;
	for (var id in workers) {
		workers[id].count = Math.ceil(Math.random() * 3);
		if (workers[id].inputThroughput) workers[id].inputThroughput = Math.ceil(Math.random() * 250);
	}
	workers["elasticsearch-writer"].count = stoppedWorker1Count + Math.ceil(Math.random() * 100);
	workers["meta-enricher"].count = stoppedWorker2Count + Math.ceil(Math.random() * 100);
	draw(true);
}, 1000);

// Do a mock change of worker configuration
setInterval(function() {
	workers["elasticsearch-monitor"] = {
		"consumers": 0,
		"count": 0,
		"inputQueue": "elasticsearch-writer",
		"inputThroughput": 50
	}
}, 5000);

// Initial draw, once the DOM is ready
document.addEventListener("DOMContentLoaded", draw);
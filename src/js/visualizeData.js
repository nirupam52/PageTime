import Chart from "chart.js/auto";

export function plotChart(dat) {
	const ctx = document.getElementById("plot").getContext("2d");
	console.log(dat);
	const myChart = new Chart(ctx, {
		type: "pie",
		data: {
			
			datasets: [{
				data: dat,
				parsing: {
					key: 'time',
				}
			}]
		},
		
	});
}

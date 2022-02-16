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
				},
				backgroundColor: [
					'rgb(255, 99, 132)',
					'rgb(54, 162, 235)',
					'rgb(255, 205, 86)',
					'rgb(255, 150, 100)',
					'rgb(120, 40, 200)',
					'rgb(60, 90, 170)'
				  ],
			}]
		},
		
		
	});
}

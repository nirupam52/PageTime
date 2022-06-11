import {timeFormatter} from "./helpers.js";

export function populateTable(timeMapArray) {
	const tableData = timeMapArray
		.map(function (value) {
			return `
        <tr>
            <td> ${value.site} </td>
            <td> ${timeFormatter(value.time)} </td>
        </tr>
        `;
		})
		.join("");

	const tableBody = document.querySelector("#tableBody");
	tableBody.innerHTML = tableData;
}

export function populateTotalTime(timeVal){
	const totalTimeHeader = document.querySelector(".totalTime");
	totalTimeHeader.innerHTML = "Total Time Browsed: " + timeFormatter(timeVal);
}



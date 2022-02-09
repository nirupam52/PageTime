function timeFormatter(timeValue) {
	if (timeValue > 59) {
		if (timeValue > 3600)
			return (
				Math.floor(timeValue / 3600) +
				"h, " +
				Math.floor((timeValue - 3600) / 60) +
				"m"
			);
		return Math.floor(timeValue / 60) + "m";
	}
	return timeValue + "s";
}

function populatePopup(timeMapArray) {
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

export function loadData(result) {

	result.sort((a, b) => b.time - a.time);
	populatePopup(result);
	
}

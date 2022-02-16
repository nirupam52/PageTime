export function timeFormatter(timeValue) {
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

export function getTopFive(data){
	data.sort((a, b) => b.time - a.time);
	if (data.length > 5){
		let topFiveSites = data.slice(0,5);
		let otherSitesTimeSum = 0;
		data.slice(5).forEach((item) => otherSitesTimeSum += item.time);
		topFiveSites.push({site: "Others", time: otherSitesTimeSum});
		return topFiveSites;
	}
	else return data;
}
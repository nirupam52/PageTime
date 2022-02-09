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
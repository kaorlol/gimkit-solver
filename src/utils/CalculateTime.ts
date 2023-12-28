export default function CalculateTime(text: string, averageWPM: number) {
	const words = text.split(/\s+/).length;
	const minutes = words / averageWPM;
	const milliseconds = Math.trunc(minutes * 60 * 1000);
	return milliseconds;
}

export function WaitForElement(selector: string): Promise<void>{
	return new Promise((resolve) => {
		const interval = setInterval(() => {
			if (document.querySelector(selector)) {
				clearInterval(interval);
				resolve();
			}
		}, 50);
	});
}

import { Sleep } from "./Sleep";

export async function TypeText(text: string, element: HTMLElement) {
	const wpm = 40;
	const delay = 100 / (wpm / 60);
	for (const char of text) {
		element.setAttribute("value", element.getAttribute("value") + char);
		await Sleep(delay);
	}
}
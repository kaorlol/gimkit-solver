export const GetElement = (xpath: string): HTMLElement | null => {
	const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement;
	return element;
};
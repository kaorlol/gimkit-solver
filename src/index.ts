console.info("🔃 [GS] Loading...");

import { InitBypass } from "./modules/Bypass";
import { FindAnswer } from "./modules/GetAnswers";
import { GetElement } from "./modules/Utils/GetElement";
import { Sleep } from "./modules/Utils/Sleep";
import { TypeText } from "./modules/Utils/TypeText";
import { WaitForElement } from "./modules/Utils/WaitForElement";

InitBypass();

async function answerQuestions(condition: () => boolean = () => true) {
	while (condition) {
		await WaitForElement(".notranslate.lang-en");
		const question = GetElement("//span[@class='notranslate lang-en']")?.textContent as string;
		const result = await FindAnswer(question);
		if (result?.answer == null) throw new Error("Answer not found");
		if (result?.type == "text") {
			const input = GetElement("//input") as HTMLInputElement;
			// input.setAttribute("value", result?.answer);
			await TypeText(result?.answer, input);
			input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));

			const submitDiv = GetElement("//div[text()='Submit']") as HTMLDivElement;
			submitDiv.dispatchEvent(new Event("click", { bubbles: true }));

			console.debug(`Submitted answer: ${result?.answer}`);
		} else if (result?.type == "mc") {
			const answers = document.querySelectorAll(".sc-jVlprr.ihVPuW") as NodeListOf<HTMLDivElement>;
			const index = Array.from(answers).findIndex((answer) => answer.querySelector(".notranslate.lang-en")?.textContent == result?.answer);
			document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: (index + 1).toString().charCodeAt(0) }));

			console.debug(`Submitted answer: ${result?.answer}`);
		}

		await Sleep(1500);
	}
}

console.info("🚀 [GS] Started.");

answerQuestions();

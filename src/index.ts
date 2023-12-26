// import { InitBypass } from "./modules/Bypass";
// import { FindAnswer } from "./modules/GetAnswers";
// import { GetElement } from "./modules/Utils/GetElement";
// // import { Sleep } from "./modules/Utils/Sleep";
// // import { TypeText } from "./modules/Utils/TypeText";
// import { WaitForElement } from "./modules/Utils/WaitForElement";

// InitBypass();

// async function answerQuestion() {
// 	await WaitForElement(".notranslate.lang-en");

// 	const question = GetElement("//span[@class='notranslate lang-en']")?.textContent as string;
// 	const result = await FindAnswer(question);
// 	if (result?.answer == null) throw new Error("Answer not found");
// 	if (result?.type == "text") {
// 		const input = GetElement("//input") as HTMLInputElement;
// 		input.setAttribute("value", result?.answer);
// 		// await TypeText(result?.answer, input);
// 		input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));

// 		const submitDiv = GetElement("//div[text()='Submit']") as HTMLDivElement;
// 		submitDiv.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));

// 		console.debug(`Submitted answer: ${result?.answer}`);
// 	} else if (result?.type == "mc") {
// 		const style = "opacity: 1; transform: translateY(0%) translateZ(0px);";
// 		const answers = GetElement(`//div[@style='${style}']`)?.childNodes[1].childNodes as NodeListOf<HTMLDivElement>;
// 		if (!answers) throw new Error("Answers not found");

// 		const index = Array.from(answers).findIndex((answer) => answer.querySelector(".notranslate.lang-en")?.textContent == result?.answer);
// 		document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: (index + 1).toString().charCodeAt(0) }));

// 		console.debug(`Submitted answer: ${result?.answer}`);

// 		// await Sleep(1000);

// 		// document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
// 	}
// }

// answerQuestion();

import SocketHandler from "./modules/SocketHandler/Socket";
import Answerer from "./scripts/Answerer";
import InitHook from "./modules/Hooks";
import Buyer from "./scripts/Buyer";

const socketHandler = new SocketHandler();
socketHandler.addEventListener("socket", (event) => {
	const detail = (event as CustomEvent).detail;
	console.info("[GS] 🪝 Hooked WebSocket:", detail.url);

	InitHook();
});

const answerer = new Answerer("Packet", socketHandler);
answerer.StartReceiver();
answerer.AutoAnswer();

const buyer = new Buyer(socketHandler);
buyer.StartReceiver();
buyer.AutoBuy();

socketHandler.GetSocket();

console.info("[GS] 🚀 Started Gimkit Solver");

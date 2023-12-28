import { AnswererData, Question } from "../types/answer";
import { Change } from "../types/socket";
import SocketHandler from "../modules/SocketHandler/Socket";
import CalculateTime from "../utils/CalculateTime";

class Answerer {
	type: string;
	socketHandler: SocketHandler;
	answerData: AnswererData;
	waitTime = 3500;
	interval: NodeJS.Timeout | undefined;

	constructor(type: string, socketHandler: SocketHandler) {
		this.type = type;
		this.socketHandler = socketHandler;
		this.answerData = {
			questions: [],
			questionIdList: [],
			currentQuestionIndex: 0,
			answerDeviceId: "",
			currentQuestionId: "",
		};
	}

	AutoAnswer() {
		if (this.type == "Packet") {
			this.StartInterval();
		}
	}

	StartReceiver() {
		this.socketHandler.addEventListener("receiveMessage", (event) => {
			const detail = (event as CustomEvent).detail;

			if (this.socketHandler.transportType == "colyseus") return;
			if (detail.key != "STATE_UPDATE") return;

			switch (detail.data.type) {
				case "GAME_QUESTIONS":
					this.answerData.questions = detail.data.value;
					break;

				case "PLAYER_QUESTION_LIST":
					this.answerData.questionIdList = detail.data.value.questionList;
					this.answerData.currentQuestionIndex = detail.data.value.questionIndex;
					break;

				case "PLAYER_QUESTION_LIST_INDEX":
					this.answerData.currentQuestionIndex = detail.data.value;
					break;
			}
		});

		this.socketHandler.addEventListener("receiveChanges", (event) => {
			if (this.socketHandler.gameEnded) return;

			const detail = (event as CustomEvent).detail;
			const changes: Change[] = detail;

			for (const change of changes) {
				for (const [key, value] of Object.entries(change.data)) {
					const mainCharacterId = window.stores.phaser.mainCharacter.id;
					if (key == "GLOBAL_questions") {
						this.answerData.questions = JSON.parse(value);
						this.answerData.answerDeviceId = change.id;
					} else if (key.includes("currentQuestionId") && key.includes(mainCharacterId)) {
						this.answerData.currentQuestionId = value;
					}
				}
			}
		});
	}

	private PacketAnswer() {
		if (this.socketHandler.transportType == "colyseus") {
			this.HandleColyseusTransport();
		} else {
			this.HandleBlueboatTransport();
		}
	}

	private HandleColyseusTransport() {
		if (this.answerData.currentQuestionId == "") return;

		const questions = this.answerData.questions;
		const currentQuestionId = this.answerData.currentQuestionId;
		const correctQuestion = questions.find((question) => question._id == currentQuestionId);
		if (!correctQuestion) return;

		const answer = this.GetAnswerForQuestion(correctQuestion);
		this.socketHandler.SendData("MESSAGE_FOR_DEVICE", {
			key: "answered",
			deviceId: this.answerData.answerDeviceId,
			data: { answer: answer },
		});

		const answerText = correctQuestion.answers.find((found) => found._id == answer)?.text ?? answer;
		console.info(`[GS] 🎯 Answered question: '${correctQuestion.text}' with answer: '${answerText}'`);
	}

	private HandleBlueboatTransport() {
		const questions = this.answerData.questions;
		const currentQuestionIndex = this.answerData.currentQuestionIndex;
		const questionId = this.answerData.questionIdList[currentQuestionIndex];
		const question = questions.find((question) => question._id == questionId);
		if (!question) return;

		const answer = this.GetAnswerForQuestion(question);
		this.socketHandler.SendData("QUESTION_ANSWERED", {
			answer,
			questionId,
		});

		const answerText = question.answers.find((found) => found._id == answer)?.text ?? answer;
		console.info(`[GS] 🎯 Answered question: '${question.text}' with answer: '${answerText}'`);
	}

	private GetAnswerForQuestion(question: Question): string {
		if (question.type == "mc") {
			const correctAnswerId = question.answers.find((answer) => answer.correct)?._id;

			const readingTime = CalculateTime(question.text, 250);
			let readingAnswersTime = 0;
			for (const answer of question.answers) {
				readingAnswersTime += CalculateTime(answer.text, 250);
				if (answer._id == correctAnswerId) break;
			}

			this.UpdateWaitTime(readingTime + readingAnswersTime);

			return (
				correctAnswerId ??
				(() => {
					throw new Error("Correct answer not found");
				})()
			);
		}

		const readingTime = CalculateTime(question.text, 250);
		const writingTime = CalculateTime(question.answers[0].text, 80);
		this.UpdateWaitTime(readingTime + writingTime);

		return question.answers[0].text;
	}

	private StartInterval() {
		clearInterval(this.interval);
		this.interval = setInterval(() => {
			if (!this.socketHandler.gameStarted) return;
			if (this.socketHandler.gameEnded) {
				clearInterval(this.interval);
				return;
			}

			this.PacketAnswer();
		}, this.waitTime);
	}

	private UpdateWaitTime(WaitTime: number) {
		this.waitTime = WaitTime + Math.trunc(Math.random(250, 500));
		this.StartInterval();

		console.debug(`[GS] ⏱️ Updated wait time to: ${this.waitTime}ms`);
	}
}

export default Answerer;

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

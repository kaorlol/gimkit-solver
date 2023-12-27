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
			const readingAnswersTime = question.answers.reduce((acc, answer) => acc + CalculateTime(answer.text, 80), 0);

			this.UpdateWaitTime(readingTime + readingAnswersTime);

			return (
				correctAnswerId ||
				(() => {
					throw new Error("Correct answer not found");
				})()
			);
		}

		const readingTime = CalculateTime(question.text, 250);
		const writingTime = CalculateTime(question.answers[0].text, 85);
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
		console.debug(`[GS] ⏱️ Wait time updated to: ${WaitTime}ms`);

		this.waitTime = WaitTime;
		this.StartInterval();
	}
}

export default Answerer;

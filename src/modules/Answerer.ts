import { AnswererData, Change, Question } from "../types";
import SocketHandler from "./SocketHandler/Socket";

class Answerer {
	type: string;
	socketHandler: SocketHandler;
	answerData: AnswererData;

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
			this.StartReceiver();

			setInterval(() => {
				this.PacketAnswer();
			}, 1000);
		}
	}

	private StartReceiver() {
		this.socketHandler.addEventListener("receiveMessage", (event) => {
			if (this.socketHandler.transportType == "colyseus") return;

			const detail = (event as CustomEvent).detail;
			if (detail?.key != "STATE_UPDATE") return;

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
			const detail = (event as CustomEvent).detail;
			const changes: Change[] = detail;

			for (const change of changes) {
				for (const [key, value] of Object.entries(change.data)) {
					if (key != "GLOBAL_questions") continue;

					this.answerData.questions = JSON.parse(value);
					this.answerData.answerDeviceId = change.id;
				}

				for (const [key, value] of Object.entries(change.data)) {
					const mainCharacterId = window.stores?.phaser?.mainCharacter?.id;
					if (key.includes("currentQuestionId") && key.includes(mainCharacterId)) {
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
		const correctQuestion = questions?.find((question) => question._id == currentQuestionId);
		if (!correctQuestion) return;

		const answerId = this.GetAnswerForQuestion(correctQuestion);
		this.socketHandler.SendData("MESSAGE_FOR_DEVICE", {
			key: "answered",
			deviceId: this.answerData.answerDeviceId,
			data: { answer: answerId },
		});

		const answerText = correctQuestion.answers.find((answer) => answer._id == answerId)?.text;
		console.info(`[GS] 🎯 Answered question: '${correctQuestion.text}' with answer: '${answerText}'`);
	}

	private HandleBlueboatTransport() {
		const questions = this.answerData.questions;
		const currentQuestionIndex = this.answerData.currentQuestionIndex;
		const questionId = this.answerData.questionIdList[currentQuestionIndex];
		const question = questions.find((question) => question._id == questionId);
		if (!question) return;

		const answerId = this.GetAnswerForQuestion(question);
		this.socketHandler.SendData("QUESTION_ANSWERED", {
			answerId,
			questionId,
		});

		const answerText = question.answers.find((answer) => answer._id == answerId)?.text;
		console.info(`[GS] 🎯 Answered question: '${question.text}' with answer: '${answerText}'`);
	}

	private GetAnswerForQuestion(question: Question): string {
		if (question.type == "mc") {
			const correctAnswerId = question.answers.find((answer) => answer.correct)?._id;
			return correctAnswerId || "";
		}

		return question.answers[0].text;
	}
}

export default Answerer;

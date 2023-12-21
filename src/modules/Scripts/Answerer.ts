import { AnswererData, Change, Question } from "../../types";
import SocketHandler from "../SocketHandler/Socket";

class Answerer {
	type: string;
	socketHandler: SocketHandler;
	answerData: AnswererData;
	gameEnded: boolean = false;

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
			const interval = setInterval(() => {
				if (this.gameEnded) {
					clearInterval(interval);
					return;
				}

				this.PacketAnswer();
			}, 1000);
		}
	}

	StartReceiver() {
		this.socketHandler.addEventListener("receiveMessage", (event) => {
			const detail = (event as CustomEvent).detail;
			if (detail?.key == "end_game" || detail?.key == "UPDATED_PLAYER_LEADERBOARD") {
				console.info("[GS] 🏁 Game ended");
				this.gameEnded = true;

				return;
			}

			if (this.socketHandler.transportType == "colyseus") return;
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
			if (this.gameEnded) return;

			const detail = (event as CustomEvent).detail;
			const changes: Change[] = detail;

			for (const change of changes) {
				for (const [key, value] of Object.entries(change.data)) {
					const mainCharacterId = window.stores?.phaser?.mainCharacter?.id;

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
		const correctQuestion = questions?.find((question) => question._id == currentQuestionId);
		if (!correctQuestion) return;

		const answer = this.GetAnswerForQuestion(correctQuestion);
		this.socketHandler.SendData("MESSAGE_FOR_DEVICE", {
			key: "answered",
			deviceId: this.answerData.answerDeviceId,
			data: { answer: answer },
		});

		const answerText = correctQuestion.answers.find((found) => found._id == answer)?.text || answer;
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

		const answerText = question.answers.find((found) => found._id == answer)?.text || answer;
		console.info(`[GS] 🎯 Answered question: '${question.text}' with answer: '${answerText}'`);
	}

	private GetAnswerForQuestion(question: Question): string {
		if (question.type == "mc") {
			const correctAnswerId = question.answers.find((answer) => answer.correct)?._id;
			return (
				correctAnswerId ||
				(() => {
					throw new Error("Correct answer not found");
				})()
			);
		}

		return question.answers[0].text;
	}
}

export default Answerer;

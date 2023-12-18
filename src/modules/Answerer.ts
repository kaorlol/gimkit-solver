import { AnswererData, Change, Packet, Question } from "../types";
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
					if (key.includes("currentQuestionId") && key.includes(window.stores?.phaser?.mainCharacter?.id)) {
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
			this.HandleNonColyseusTransport();
		}
	}

	private HandleColyseusTransport() {
		if (this.answerData.currentQuestionId == "") return;

		const correctQuestion = this.answerData.questions?.find((question) => question._id == this.answerData.currentQuestionId);
		if (!correctQuestion) return;

		const packet: Packet = {
			key: "answered",
			deviceId: this.answerData.answerDeviceId,
			data: { answer: this.GetAnswerForQuestion(correctQuestion) },
		};

		this.socketHandler.SendData("MESSAGE_FOR_DEVICE", packet);
	}

	private HandleNonColyseusTransport() {
		const questionId = this.answerData.questionIdList[this.answerData.currentQuestionIndex];
		const question = this.answerData.questions.find((question) => question._id == questionId);
		if (!question) return;

		const answer = this.GetAnswerForQuestion(question);
		this.socketHandler.SendData("QUESTION_ANSWERED", {
			answer,
			questionId,
		});
	}

	private GetAnswerForQuestion(question: Question): string {
		if (question.type == "mc") {
			const correctAnswerId = question.answers.find((answer) => answer.correct)?._id;
			return correctAnswerId || "";
		} else {
			return question.answers[0].text;
		}
	}
}

export default Answerer;

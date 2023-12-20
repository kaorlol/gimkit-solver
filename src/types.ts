declare global {
	interface Window {
		stores: {
			phaser: {
				mainCharacter: {
					id: string;
				};
			},
			network: {
				room: {
					connection: {
						transport: {
							ws: {
								url: string;
							}
						};
					};
				};
			};
		};
	}
}

export interface Socket extends WebSocket {
	_send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
	RegisterSocket: (socket: Socket) => void;
}

export interface Packet {
	key?: string;
	deviceId?: string;
	answer?: string;
	questionId?: string;
	data?: {
		[key: string]: string;
	};
}

export interface Change {
	id: string;
	data: {
		[key: string]: string;
	};
}

export interface Question {
	_id: string;
	answers: {
		_id: string;
		text: string;
		correct: boolean;
	}[];
	text: string;
	type: "text" | "mc";
}

export interface AnswererData {
	questions: Question[];
	questionIdList: string[];
	currentQuestionIndex: number;
	answerDeviceId: string;
	currentQuestionId: string;
}
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

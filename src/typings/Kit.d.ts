export type Kit = {
	kit: {
		questions: {
			type: string;
			text: string;
			answers: {
				correct: boolean;
				text: string;
			}[];
		}[];
	};
};

const PROMPT_ID = 'pmpt_6938b78842888194b3b1401fee724f360e7139e8dfaae44f';
window.ai = {
	persistentConversation: null,
	init: function() {
		window.ai.persistentConversation = new buildfire.ai.persistentConversation();
	},
	generateAiCode: function(options, callback) {
		window.ai.persistentConversation.fetchTextResponse({
			message: options.message,
			promptId: PROMPT_ID,
			conversationId: options.conversationId || null,
			loadingMessage: 'Your code is being generated. This may take a couple minutes',
		}, (err, res) => {
			if (err) return callback(err);
	
			if (!res || !res.data || !res.data.response || !res.data.response.length ||
				!window.ai._extractHtmlContent(res.data.response)
			) {
				return callback('No response from AI');
			}
			const aiResponse = window.ai._extractHtmlContent(res.data.response);
			callback(null, {response: aiResponse, conversationId: res.data.conversationId});
		});
	},
	deleteConversation: function(conversationId, callback) {
		window.ai.persistentConversation.deleteConversation({conversationId}, (err, res) => {
			if (err) {
				if (callback) callback(err);
				return;
			}
			if (callback) callback(null, res);
		});
	},
	
	_extractHtmlContent: function(htmlString) {
		// Remove everything before <!DOCTYPE html> or <html>
		let result = htmlString.replace(/^[\s\S]*?(<!DOCTYPE html>|<html>)/i, '$1');
	
		// Remove everything after </html>
		result = result.replace(/(<\/html>)[\s\S]*$/i, '$1');
	
		return result;
	}
};

window.ai.init();

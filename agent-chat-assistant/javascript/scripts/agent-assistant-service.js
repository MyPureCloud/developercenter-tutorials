/**
 * This is a module that simulates an agent assistant.
 * It listens for keywords from the customer and suggests 
 * possible responses for the agent.
 */

const responseMap = {
    1: "Please wait while I connect you to a voice agent",
    2: "I could provide you a one-time discount",
    3: "We're sorry to hear about your experience.",
    4: "We're glad that you enjoy our service!",
    5: "Goodbye. Please don't forget to like and subscribe our channel." 
}

const keywordMap = {
    'talk': 1,
    'expensive': 2,
    'afford': 2,
    'price': 2,
    'bad': 3,
    'suck': 3,
    'stupid': 3,
    'amazing': 4,
    'thank': 4,
    'helpful': 4,
    'bye': 5
}

export default {
    /**
     * Analyzses the text for any keyword
     * @param {String} origText the text to be analyzed
     * @returns {Array} possible responses 
     */
    analyzeText(origText){
        let responses = [];
        let text = origText.toLowerCase();
        let responseIndexArr = []; 

        Object.keys(keywordMap).forEach(key => {    
            let index = keywordMap[key];

            let val = responseMap[`${index}`];

            if(text.includes(key) && !responseIndexArr.includes(index)){
                responses.push(val);
                responseIndexArr.push(index);
            }
        })

        return responses;
    }
}
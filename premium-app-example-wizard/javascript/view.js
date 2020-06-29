const elLoadingModal = document.getElementById('loading-modal');

export default {
    /**
     * Show the loading modal 
     * @param {String} message 
     */
    showLoadingModal(message){
        console.info(`modal: ${message}`);

        elLoadingModal.style.display = '';
        let elMessage = elLoadingModal.querySelectorAll('.modal-message')[0]
                            .innerText = message;
    },

    /**
     * Hide the loading modal
     */
    hideLoadingModal(){
        console.info('hide-modal');
        elLoadingModal.style.display = 'none';
    },

    /**
     * Show the content div of the page
     */
    showContent(){
        let elContent = document.querySelectorAll('.content')[0];
        elContent.style.visibility = '';
    },

    /**
     * Hide the content div of the page
     */
    hideContent(){
        let elContent = document.querySelectorAll('.content')[0];
        elContent.style.visibility = 'hidden';
    },

    /**
     * Show the message that the product is available
     */
    showProductAvailable(){
        let elAvailable = document.getElementById('available');
        let elUnavailable = document.getElementById('unavailable');
        elAvailable.style.display = '';
        elUnavailable.style.display = 'none';
    },

    /**
     * Show the message that the product is unavailable.
     */
    showProductUnavailable(){
        let elAvailable = document.getElementById('available');
        let elUnavailable = document.getElementById('unavailable');
        elAvailable.style.display = 'none';
        elUnavailable.style.display = '';
    },  
}

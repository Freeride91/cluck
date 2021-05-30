/* eslint-disable import/no-anonymous-default-export */
export default () => {
    var timerID;
    var interval = 50;
    // prettier-ignore
    self.addEventListener("message", (e) => { // eslint-disable-line no-restricted-globals
        if (e.data === "start") {
            //  console.log("starting");
            timerID = setInterval(function () {
                postMessage("tick");
            }, interval);
        } else if (e.data.interval) {
            interval = e.data.interval;
            console.log("setting interval");
            console.log("interval=" + interval);
            if (timerID) {
                clearInterval(timerID);
                timerID = setInterval(function () {
                    postMessage("tick");
                }, interval);
            }
        } else if (e.data === "stop") {
            //  console.log("stopping");
            clearInterval(timerID);
            timerID = null;
        }
    });
};

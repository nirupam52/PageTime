import "../../node_modules/bootstrap/dist/js/bootstrap.bundle.min.js";
import "../scss/style.scss";
import { getTopFive } from "./helpers.js";

import { populateTable, populateTotalTime } from "./loadData.js";
import { plotChart } from "./visualizeData.js";


browser.storage.local.get().then(function (result) {
    let pageData = [];
    let totalTime = 0;
    for (const key of Object.keys(result)) {
        pageData.push({ site: key, time: result[key] });
        totalTime += result[key];
    }
    let topFiveSites = getTopFive(pageData);
    populateTable(topFiveSites);
    populateTotalTime(totalTime);
    plotChart(topFiveSites);
});

let resetbutton = document.getElementById("reset");
resetbutton.addEventListener('click', function(){
    browser.storage.local.clear().then(function(){
        console.log('data cleared');
        populateTable([]);
        populateTotalTime(0);
    });
});

let moreInfoButton = document.getElementById("moreInfo");
moreInfoButton.addEventListener('click',function(){
    browser.tabs.create({
        url: browser.runtime.getURL('./info.html')
    });
});
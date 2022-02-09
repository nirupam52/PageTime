import "../../node_modules/bootstrap/dist/js/bootstrap.bundle.min.js";
import "../scss/style.scss";

import { populateTable, populateTotalTime } from "./loadData.js";
import { plotChart } from "./visualizeData.js";


browser.storage.local.get().then(function (result) {
    let pageData = [];
    let totalTime = 0;
    for (const key of Object.keys(result)) {
        pageData.push({ site: key, time: result[key] });
        totalTime += result[key];
    }
    populateTable(pageData);
    populateTotalTime(totalTime);
    plotChart(pageData);
});



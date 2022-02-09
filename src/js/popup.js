import "../../node_modules/bootstrap/dist/js/bootstrap.bundle.min.js";
import "../scss/style.scss";

import { loadData } from "./loadData.js";
import { plotChart } from "./visualizeData.js";


browser.storage.local.get().then(function (result) {
    let pageData = [];
    for (const key of Object.keys(result)) {
        pageData.push({ site: key, time: result[key] });
    }
    loadData(pageData);
    plotChart(pageData);
});



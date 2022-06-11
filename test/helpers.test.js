import {timeFormatter, getTopFive} from '../src/js/helpers';

test('testing time formatter', () => {
    expect(timeFormatter(40)).toBe("40s");
    expect(timeFormatter(70)).toBe("1m");
    expect(timeFormatter(119)).toBe("1m");
    expect(timeFormatter(3605)).toBe("1h, 0m");
    expect(timeFormatter(3660)).toBe("1h, 1m");
    expect(timeFormatter(7270)).toBe("2h, 1m");
    expect(() => timeFormatter(null)).toThrow('Invalid input to timeFormatter');
    expect(() => timeFormatter("abc")).toThrow('Invalid input to timeFormatter');
});

let data = [{site:"a", time:50}, {site:"b", time:40}, {site:"c", time:90}, {site:"d", time:10}, {site:"e", time:80}, {site:"f", time:200}, {site:"g", time:30}];
test('testing top five', () =>{
    expect(getTopFive(data)).toEqual([ {site:"f", time:200}, {site:"c", time:90}, {site:"e", time:80}, {site:"a", time:50}, {site:"b", time:40}, {site:"Others", time:40}])
    expect(getTopFive(data.slice(0,2))).toEqual([{site:"f", time:200}, {site:"c", time:90}]);
});

/**
 * Adjust price figures within DOM Nodes
 * - Can account for vast variations in underlying HTML.
 * - Modifies the DOM without disrupting page structure.
 *
 * @example
 * // Lower all the prices on the page by 2.46
 * AdjustPrices.adjust(-2.46, document.body);
 *
 * // Increase all the prices on the page by 7,395
 * AdjustPrices.adjust(7395, document.body);
 *
 * // Lower all the prices on the page by 14%
 * AdjustPrices.adjust("-14%", document.body);
 *
 * // Increase all the prices on the page by 39.2%
 * AdjustPrices.adjust("39.2%", document.body);
 *
 */

let AdjustPrices = (function () {
    let _this = {};

    /**
     * @param string   str      The original string
     * @param integer  start    The start point for replacement
     * @param integer  limit    The number of characters from "start" to replace
     * @param string   new_str  The replacement string
     * @return string
     */
    function replace_text(str, start, limit, new_str) {
        return str.substring(0, start) + new_str + str.substring(start + limit);
    }

    /**
     * Convert an array of characters to a float
     * @param array  array  Character array
     * @return float
     */
    function arr_to_float(chars) {
        return parseFloat(chars.join("").replace(/([^\d.])/, ""));
    }

    /**
     * Convert a float to a proper number format
     * eg 31337.357 becomes "31,337.357"
     * @param float  float
     * @return string
     */
    function number_format(float) {
        let parts = float.split(".");
        let buffer = "";
        let j = 0;
        for (var i = parts[0].length - 1; i > -1; i--) {
            ++j;
            buffer = parts[0][i] + buffer;
            if (j % 3 == 0 && i != 0) {
                buffer = "," + buffer;
            }
        }
        return buffer + "." + parts[1];
    }

    /**
     * Check if one element is the descendant of another
     * @param object  child   Prospective child element
     * @param object  parent  Prospective parent element
     * @return bool
     */
    function is_decendant(child, parent) {
        while (child.parentNode) {
            if (child.parentNode == parent) {
                return true;
            }
            child = child.parentNode;
        }
        return false;
    }

    /**
     * Get all elements that contain prices
     * @param object  parent  Optional, parent-most element to search.
     * @return array Price-containing child elements
     */
    function get_price_elements(parent) {
        let el = parent || document.body;
        let nodes = el.getElementsByTagName("*");
        let results = [];
        let match = -1;
        let last_node = null;
        let last_match = null;
        let skip_children = false;
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            if (match = node.textContent.match(/\$(\d[\d.,]*|\$\.\d{2})/g)) {
                if (skip_children && is_decendant(node, last_node)) {
                    continue;
                }
                skip_children = false;
                if (last_node == node.parentNode) {
                    if (last_match.length == match.length) {
                        results.pop();
                    } else if (last_match.length > match.length) {
                        skip_children = true;
                        continue;
                    }
                }
                results.push(node);
                last_node = node;
                last_match = match;
            }
        }
        return results;
    }

    /**
     * Capture the price amount at a given index within a text
     * @param string   text   The working text
     * @param integer  index  Character index to start from
     * @return Object {text, map, float}
     */
    function capture_amount(text, index) {
        let allowed = ["1","2","3","4","5","6","7","8","9","0",".",","];
        let on_tag = false;
        let buffer = [];
        let index_map = [];
        for (let i = index + 1; i <= text.length - 1; i++) {
            let char = text[i];
            if (char == "<") {
                on_tag = true;
            } else if (on_tag && char == ">") {
                on_tag = false;
                continue;
            }
            if (on_tag) {
                continue;
            }
            if (allowed.indexOf(char) < 0) {
                break;
            }
            buffer.push(char);
            index_map[buffer.length - 1] = i;
        }
        while ([".", ","].indexOf(buffer[buffer.length - 1]) > -1) {
            buffer.pop();
            index_map.pop();
        }
        return {
            text: buffer,
            map: index_map,
            float: arr_to_float(buffer)
        };
    }

    /**
     * Adjust the prices in a given element by a given amount
     * @param mixed   adjustment  Amount to increase/decrease prices by
     * @param object  el          Element to adjust prices in
     * @return Element            Modified el
     */
    function adjust_el(adjustment, el) {
        let regex = /\$/g;
        let match = el.textContent.match(regex);
        if (!match || match.length == 0) {
            return false;
        }
        let max_total = match.length;
        let html = el.innerHTML;
        const isPercentAdjustment = (
            typeof adjustment === "string" && adjustment.indexOf("%") > 0
        );
        if (isPercentAdjustment) {
            adjustment = parseFloat(adjustment);
        }
        let amount, aValue, aMap;
        for (i = 0; i < max_total; i++) {
            match = regex.exec(html);
            amount = capture_amount(html, match.index);
            [aValue, aMap] = [amount["float"], amount["map"]];
            if (isPercentAdjustment) {
                adjusted = (((aValue / 100) * adjustment) + aValue).toFixed(2);
            }else{
                adjusted = (aValue + adjustment).toFixed(2);
            }
            let adjStr = number_format(adjusted);
            for (let j = aMap.length-1, k = adjStr.length-1; j >= 0; j--,k--) {
                if (k >= 0) {
                    html = replace_text(html, aMap[j], 1, adjStr[k]);
                } else {
                    html = replace_text(html, aMap[j], 1, "");
                }
                if (j == 0 && k > 0) {
                    html = replace_text(html, aMap[j], 1, adjStr.substring(0, k+1));
                }
            }
        }
        el.innerHTML = html;
        return el;
    }

    /**
     * Adjust the prices of a given element and its children
     * @param mixed    adjustment  Amount to increase/decrease prices by
     * @param object   parent      Optional, parent element to search under
     * @param integer  max         Maximum number of prices to adjust
     * @return void
     */
    _this.adjust = function(adjustment, parent, max) {
        let nodes = get_price_elements(parent).slice(0, max);
        for (let i = nodes.length - 1; i >= 0; i--) {
            adjust_el(adjustment, nodes[i]);
        }
    };

    return _this;
}());
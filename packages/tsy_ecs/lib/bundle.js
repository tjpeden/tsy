"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Bundle = void 0;

var _component = require("./component");

class Bundle {
  get components() {
    const self = this;
    return Object.getOwnPropertyNames(self).reduce((components, key) => {
      const component = self[key];

      if (component instanceof _component.Component) {
        components.push(component);
      } else if (component instanceof Bundle) {
        components.push(...component.components);
      }

      return components;
    }, []);
  }

}

exports.Bundle = Bundle;
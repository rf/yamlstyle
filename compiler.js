var tokenizer = require('./tokenizer');

// ## processSelector
// Parses a selector into an array of objects with type, id, classes properties.

var selectorTokenizer;

function processSelector (selector) {
  var output = [{}];
  var currOutput = output[0];
  var lastType = "start";

  if (!selectorTokenizer) selectorTokenizer = tokenizer({
    type: "^[a-zA-Z\\-]+",
    id: "^\\#[a-zA-Z\\-]+",
    'class': "^\\.[a-zA-Z\\-]+",
    space: "^ ",
    or: "^, "
  });

  while (selector.length > 0) {
    var match = selectorTokenizer(selector);
    if (!match) break;

    switch (match.type) {
      case "type":
        currOutput.type = match.str;
      break;

      case "id":
        currOutput.id = match.str.slice(1);
      break;

      case "class":
        currOutput.classes = currOutput.classes || [];
        currOutput.classes.push(match.str.slice(1));
      break;

      case "or":
        currOutput = {};
        output.push(currOutput);
      break;

      case "space": throw new Error("Descendency not supported");
    }

    selector = selector.slice(match.str.length);
    lastType = match.type;
  }

  if (output.classes) output.classes.sort();
  return output;
}

// ## compileQuery
// Compiles a query to a javascript function. This function will take a
// single argument, a hash of properties to be used in the evaluation of the
// query. The query supports and, or, and ().

var queryTokenizer;

function compileQuery (query) {
  query = query.slice(1); // slice off the $
  var fn = "(function query (locals) { with (locals) { return ";

  if (!queryTokenizer) {
    queryTokenizer = tokenizer({
      ident: "^[a-zA-Z\\-]+",
      and: "^ ?and ",
      or: "^ ?or ",
      openParen: "^\\(",
      closeParen: "^\\)"
    });
  }

  while (query.length > 0) {
    var match = queryTokenizer(query);
    if (!match) break;
    switch (match.type) {
      case "and": fn += " && "; break;
      case "or":  fn += " || "; break;

      default: fn += match.str; break;
    }
    query = query.slice(match.str.length);
  }

  fn += "; } });";

  return eval(fn);
}

// ## compileAllQueries
// Takes a style bit and compiles all queries within the bit using the function
// above.

function compileAllQueries (bit) {
  for (var key in bit) {
    if (key[0] == "$") {
      var styles = bit[key];
      delete bit[key];

      bit.$queries = bit.$queries || [];

      compileAllQueries(styles);

      bit.$queries.push({
        fn: compileQuery(key),
        $styles: styles
      });
    }
  }

  return bit;
}

function flattenSingle (a) {
  return a.reduce(function (memo, item) {
    if (Array.isArray(item)) memo = memo.concat(item);
    else memo.push(item);

    return memo;
  }, []);
}

function cartesian () {
  return [].slice.call(arguments).reduce(function (memo, item) {
    return flattenSingle(memo.map(function (x) {
      return item.map(function (y) { return x.concat([y]); });
    }));
  }, [[]]);
}

function insertClassTree (dest, classes, bitId) {
  
}

function compile (input) {
  var output = {bits: [], selectors: {}};

  for (var strSelector in input) {
    var selectors = processSelector(strSelector);
    var bit = compileAllQueries(input[selector]);

    var bitId = output.bits.push(bit) - 1;

    for (var i = 0; i < selectors.length; i++) {
      var selector = selectors[i];

      console.dir(selector);

      var possibilities = cartesian(
        [selector.type], 
        ["", selector.id]
      );

      console.dir(possibilities);
    }
  }
  
  return output;
}

module.exports = compile;

compile.processSelector = processSelector;
compile.compileQuery = compileQuery;
compile.compileAllQueries = compileAllQueries;
compile.flattenSingle = flattenSingle;
compile.cartesian = cartesian;

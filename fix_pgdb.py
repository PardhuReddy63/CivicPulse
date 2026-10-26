
from pathlib import Path



p = Path.home() / "CivicPulse/backend/src/config/pgDb.js"

s = p.read_text()



start = s.index("function convertSql(sql) {")

end = s.index("\nfunction wrapClient(client)", start)



replacement = r'''function convertSql(sql) {

  let output = '';

  let index = 0;

  let state = 'normal';



  for (let i = 0; i < sql.length; i++) {

    const char = sql[i];

    const next = sql[i + 1];



    if (state === 'normal') {

      if (char === "'") state = 'single';

      else if (char === '"') state = 'double';

      else if (char === '-' && next === '-') state = 'lineComment';

      else if (char === '/' && next === '*') state = 'blockComment';



      if (char === '?' ) {

        output += `$${++index}`;

      } else {

        output += char;

      }

      continue;

    }



    output += char;



    if ((state === 'single' && char === "'" && next === "'") ||

        (state === 'double' && char === '"' && next === '"')) {

      output += sql[++i];

    } else if ((state === 'single' && char === "'") ||

               (state === 'double' && char === '"')) {

      state = 'normal';

    } else if (state === 'lineComment' && char === '\n') {

      state = 'normal';

    } else if (state === 'blockComment' && char === '*' && next === '/') {

      output += sql[++i];

      state = 'normal';

    }

  }



  return output;

}



function convertResult(result) {

  if (result.command === 'SELECT') return result.rows;



  return {

    rows: result.rows,

    rowCount: result.rowCount,

    affectedRows: result.rowCount,

    insertId: result.command === 'INSERT' && result.rows?.[0]

      ? Object.values(result.rows[0])[0]

      : undefined,

  };

}

'''



p.write_text(s[:start] + replacement + s[end:])

print("Updated convertSql and convertResult.")

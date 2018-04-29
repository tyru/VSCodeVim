import * as assert from 'assert';

import { getAndUpdateModeHandler } from '../../extension';
import { Globals } from '../../src/globals';
import { ModeName } from '../../src/mode/mode';
import { ModeHandler } from '../../src/mode/modeHandler';
import { TextEditor } from '../../src/textEditor';
import { getTestingFunctions } from '../testSimplifier';
import {
  assertEqual,
  assertEqualLines,
  cleanUpWorkspace,
  reloadConfiguration,
  setupWorkspace,
} from './../testUtils';

suite('Mode Visual', () => {
  let modeHandler: ModeHandler;

  let { newTest, newTestOnly } = getTestingFunctions();

  setup(async () => {
    await setupWorkspace();
    modeHandler = await getAndUpdateModeHandler();
  });

  teardown(cleanUpWorkspace);

  test('can be activated', async () => {
    await modeHandler.handleKeyEvent('v');
    assertEqual(modeHandler.currentMode.name, ModeName.Visual);

    await modeHandler.handleKeyEvent('v');
    assertEqual(modeHandler.currentMode.name, ModeName.Normal);
  });

  test('Can handle w', async () => {
    await modeHandler.handleMultipleKeyEvents('itest test test\ntest\n'.split(''));
    await modeHandler.handleMultipleKeyEvents(['<Esc>', 'g', 'g', 'v', 'w']);

    const sel = TextEditor.getSelection();

    assert.equal(sel.start.character, 0);
    assert.equal(sel.start.line, 0);

    // The input cursor comes BEFORE the block cursor. Try it out, this
    // is how Vim works.
    assert.equal(sel.end.character, 6);
    assert.equal(sel.end.line, 0);
  });

  test('Can handle wd', async () => {
    await modeHandler.handleMultipleKeyEvents('ione two three'.split(''));
    await modeHandler.handleMultipleKeyEvents(['<Esc>', '^', 'v', 'w', 'd']);

    assertEqualLines(['wo three']);
  });

  test('Can handle x', async () => {
    await modeHandler.handleMultipleKeyEvents('ione two three'.split(''));
    await modeHandler.handleMultipleKeyEvents(['<Esc>', '^', 'v', 'x']);

    assertEqualLines(['ne two three']);

    assertEqual(modeHandler.currentMode.name, ModeName.Normal);
  });

  test('Can handle x across a selection', async () => {
    await modeHandler.handleMultipleKeyEvents('ione two three'.split(''));
    await modeHandler.handleMultipleKeyEvents(['<Esc>', '^', 'v', 'w', 'x']);

    assertEqualLines(['wo three']);

    assertEqual(modeHandler.currentMode.name, ModeName.Normal);
  });

  test('Can do vwd in middle of sentence', async () => {
    await modeHandler.handleMultipleKeyEvents('ione two three foar'.split(''));
    await modeHandler.handleMultipleKeyEvents(['<Esc>', '^', 'l', 'l', 'l', 'l', 'v', 'w', 'd']);

    assertEqualLines(['one hree foar']);
  });

  test('Can do vwd in middle of sentence', async () => {
    await modeHandler.handleMultipleKeyEvents('ione two three'.split(''));
    await modeHandler.handleMultipleKeyEvents(['<Esc>', '^', 'l', 'l', 'l', 'l', 'v', 'w', 'd']);

    assertEqualLines(['one hree']);
  });

  test('Can do vwd multiple times', async () => {
    await modeHandler.handleMultipleKeyEvents('ione two three four'.split(''));
    await modeHandler.handleMultipleKeyEvents([
      '<Esc>',
      '^',
      'v',
      'w',
      'd',
      'v',
      'w',
      'd',
      'v',
      'w',
      'd',
    ]);

    assertEqualLines(['our']);
  });

  test('handles case where we go from selecting on right side to selecting on left side', async () => {
    await modeHandler.handleMultipleKeyEvents('ione two three'.split(''));
    await modeHandler.handleMultipleKeyEvents([
      '<Esc>',
      '^',
      'l',
      'l',
      'l',
      'l',
      'v',
      'w',
      'b',
      'b',
      'd',
    ]);

    assertEqualLines(['wo three']);
  });

  newTest({
    title: 'Can handle H key',
    start: ['1', '2', '|3', '4', '5'],
    keysPressed: 'vH',
    end: ['|1', '2', '3', '4', '5'],
  });

  test('handles case where we delete over a newline', async () => {
    await modeHandler.handleMultipleKeyEvents('ione two\n\nthree four'.split(''));
    await modeHandler.handleMultipleKeyEvents(['<Esc>', '0', 'k', 'k', 'v', '}', 'd']);

    assertEqualLines(['three four']);
  });

  test('handles change operator', async () => {
    await modeHandler.handleMultipleKeyEvents('ione two three'.split(''));
    await modeHandler.handleMultipleKeyEvents(['<Esc>', '^', 'v', 'w', 'c']);

    assertEqualLines(['wo three']);
    assertEqual(modeHandler.currentMode.name, ModeName.Insert);
  });

  suite("Vim's EOL handling is weird", () => {
    test('delete through eol', async () => {
      await modeHandler.handleMultipleKeyEvents('ione\ntwo'.split(''));

      await modeHandler.handleMultipleKeyEvents(['<Esc>', '^', 'g', 'g', 'v', 'l', 'l', 'l', 'd']);

      assertEqualLines(['two']);
    });

    test('join 2 lines by deleting through eol', async () => {
      await modeHandler.handleMultipleKeyEvents('ione\ntwo'.split(''));

      await modeHandler.handleMultipleKeyEvents(['<Esc>', 'g', 'g', 'l', 'v', 'l', 'l', 'd']);

      assertEqualLines(['otwo']);
    });

    test("d$ doesn't delete whole line", async () => {
      await modeHandler.handleMultipleKeyEvents('ione\ntwo'.split(''));

      await modeHandler.handleMultipleKeyEvents(['<Esc>', 'g', 'g', 'd', '$']);

      assertEqualLines(['', 'two']);
    });

    test('vd$ does delete whole line', async () => {
      await modeHandler.handleMultipleKeyEvents('ione\ntwo'.split(''));

      await modeHandler.handleMultipleKeyEvents(['<Esc>', 'g', 'g', 'v', '$', 'd']);

      assertEqualLines(['two']);
    });

    newTest({
      title: 'Paste over selection copies the selection',
      start: ['|from to'],
      keysPressed: 'dewvep0P',
      end: ['t|o from'],
    });

    newTest({
      title: 'Paste over selection copies the selection linewise',
      start: ['foo', 'bar', '|fun'],
      keysPressed: 'viwykVkpp',
      end: ['fun', '|foo', 'bar', 'fun'],
    });
  });

  suite('Arrow keys work perfectly in Visual Mode', () => {
    newTest({
      title: 'Can handle <up> key',
      start: ['blah', 'duh', '|dur', 'hur'],
      keysPressed: 'v<up>x',
      end: ['blah', '|ur', 'hur'],
    });

    newTest({
      title: 'Can handle <down> key',
      start: ['blah', 'duh', '|dur', 'hur'],
      keysPressed: 'v<down>x',
      end: ['blah', 'duh', '|ur'],
    });

    newTest({
      title: 'Can handle <left> key',
      start: ['blah', 'duh', 'd|ur', 'hur'],
      keysPressed: 'v<left>x',
      end: ['blah', 'duh', '|r', 'hur'],
    });

    newTest({
      title: 'Can handle <right> key',
      start: ['blah', 'duh', '|dur', 'hur'],
      keysPressed: 'v<right>x',
      end: ['blah', 'duh', '|r', 'hur'],
    });
  });

  suite('handles aw in visual mode', () => {
    newTest({
      title: "Can handle 'vawd' on word with cursor inside spaces",
      start: ['one   two |  three,   four  '],
      keysPressed: 'vawd',
      end: ['one   two|,   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vawd' on word with trailing spaces",
      start: ['one   tw|o   three,   four  '],
      keysPressed: 'vawd',
      end: ['one   |three,   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vawd' on word with leading spaces",
      start: ['one   two   th|ree,   four  '],
      keysPressed: 'vawd',
      end: ['one   two|,   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vawd' on word with numeric prefix",
      start: ['on|e   two   three,   four  '],
      keysPressed: 'v3awd',
      end: ['|,   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vawd' on word with numeric prefix and across lines",
      start: ['one   two   three,   fo|ur  ', 'five  six'],
      keysPressed: 'v2awd',
      end: ['one   two   three,   |six'],
      endMode: ModeName.Normal,
    });

    newTest({
      title:
        "Can handle 'vawd' on word with numeric prefix and across lines, containing words end with `.`",
      start: ['one   two   three,   fo|ur  ', 'five.  six'],
      keysPressed: 'v2awd',
      end: ['one   two   three,   |.  six'],
      endMode: ModeName.Normal,
    });
  });

  suite('handles aW in visual mode', () => {
    newTest({
      title: "Can handle 'vaWd' on big word with cursor inside spaces",
      start: ['one   two |  three,   four  '],
      keysPressed: 'vaWd',
      end: ['one   two|   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vaWd' on word with trailing spaces",
      start: ['one   tw|o   three,   four  '],
      keysPressed: 'vaWd',
      end: ['one   |three,   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vaWd' on word with leading spaces",
      start: ['one   two   th|ree,   four  '],
      keysPressed: 'vaWd',
      end: ['one   two   |four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vaWd' on word with numeric prefix",
      start: ['on|e   two   three,   four  '],
      keysPressed: 'v3aWd',
      end: ['|four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vaWd' on word with numeric prefix and across lines",
      start: ['one   two   three,   fo|ur  ', 'five.  six'],
      keysPressed: 'v2aWd',
      end: ['one   two   three,   |six'],
      endMode: ModeName.Normal,
    });
  });

  suite('handles aW in visual mode', () => {
    newTest({
      title: "Can handle 'vaWd' on big word with cursor inside spaces",
      start: ['one   two |  three,   four  '],
      keysPressed: 'vaWd',
      end: ['one   two|   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vaWd' on word with trailing spaces",
      start: ['one   tw|o   three,   four  '],
      keysPressed: 'vaWd',
      end: ['one   |three,   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vaWd' on word with leading spaces",
      start: ['one   two   th|ree,   four  '],
      keysPressed: 'vaWd',
      end: ['one   two   |four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vaWd' on word with numeric prefix",
      start: ['on|e   two   three,   four  '],
      keysPressed: 'v3aWd',
      end: ['|four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vaWd' on word with numeric prefix and across lines",
      start: ['one   two   three,   fo|ur  ', 'five.  six'],
      keysPressed: 'v2aWd',
      end: ['one   two   three,   |six'],
      endMode: ModeName.Normal,
    });
  });

  suite('handles aw in visual mode', () => {
    newTest({
      title: "Can handle 'vawd' on word with cursor inside spaces",
      start: ['one   two |  three,   four  '],
      keysPressed: 'vawd',
      end: ['one   two|,   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vawd' on word with trailing spaces",
      start: ['one   tw|o   three,   four  '],
      keysPressed: 'vawd',
      end: ['one   |three,   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vawd' on word with leading spaces",
      start: ['one   two   th|ree,   four  '],
      keysPressed: 'vawd',
      end: ['one   two|,   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vawd' on word with numeric prefix",
      start: ['on|e   two   three,   four  '],
      keysPressed: 'v3awd',
      end: ['|,   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vawd' on word with numeric prefix and across lines",
      start: ['one   two   three,   fo|ur  ', 'five  six'],
      keysPressed: 'v2awd',
      end: ['one   two   three,   |six'],
      endMode: ModeName.Normal,
    });

    newTest({
      title:
        "Can handle 'vawd' on word with numeric prefix and across lines, containing words end with `.`",
      start: ['one   two   three,   fo|ur  ', 'five.  six'],
      keysPressed: 'v2awd',
      end: ['one   two   three,   |.  six'],
      endMode: ModeName.Normal,
    });
  });

  suite('handles aW in visual mode', () => {
    newTest({
      title: "Can handle 'vaWd' on big word with cursor inside spaces",
      start: ['one   two |  three,   four  '],
      keysPressed: 'vaWd',
      end: ['one   two|   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vaWd' on word with trailing spaces",
      start: ['one   tw|o   three,   four  '],
      keysPressed: 'vaWd',
      end: ['one   |three,   four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vaWd' on word with leading spaces",
      start: ['one   two   th|ree,   four  '],
      keysPressed: 'vaWd',
      end: ['one   two   |four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vaWd' on word with numeric prefix",
      start: ['on|e   two   three,   four  '],
      keysPressed: 'v3aWd',
      end: ['|four  '],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'vaWd' on word with numeric prefix and across lines",
      start: ['one   two   three,   fo|ur  ', 'five.  six'],
      keysPressed: 'v2aWd',
      end: ['one   two   three,   |six'],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Can handle 'Y' in visual mode",
      start: ['one', '|two'],
      keysPressed: 'vwYP',
      end: ['one', '|two', 'two'],
      endMode: ModeName.Normal,
    });
  });

  suite('handles as in visual mode', () => {
    newTest({
      title: 'Select sentence with trailing spaces in visual mode',
      start: ["That's my sec|ret, Captain. I'm always angry."],
      keysPressed: 'vlasd',
      end: ["That's my sec|I'm always angry."],
      endMode: ModeName.Normal,
    });

    newTest({
      title: 'Select sentence with leading spaces in visual mode',
      start: ["That's my secret, Captain. I'm a|lways angry."],
      keysPressed: 'vhasd',
      end: ["That's my secret, Captain.|ways angry."],
      endMode: ModeName.Normal,
    });

    newTest({
      title: 'Select multiple sentences in visual mode',
      start: ["That's my secret, Captain. I|'m always angry."],
      keysPressed: 'vhhasd',
      end: ['|m always angry.'],
      endMode: ModeName.Normal,
    });
  });

  suite('handles is in visual mode', () => {
    newTest({
      title: 'Select inner sentence with trailing spaces in visual mode',
      start: ["That's my sec|ret, Captain. I'm always angry."],
      keysPressed: 'vlisd',
      end: ["That's my sec| I'm always angry."],
      endMode: ModeName.Normal,
    });

    newTest({
      title: 'Select inner sentence with leading spaces in visual mode',
      start: ["That's my secret, Captain. I'm a|lways angry."],
      keysPressed: 'vhisd',
      end: ["That's my secret, Captain. |ways angry."],
      endMode: ModeName.Normal,
    });

    newTest({
      title: 'Select spaces between sentences in visual mode',
      start: ["That's my secret, Captain.  |  I'm always angry."],
      keysPressed: 'vhisd',
      end: ["That's my secret, Captain.| I'm always angry."],
      endMode: ModeName.Normal,
    });
  });

  suite('handles tag blocks in visual mode', () => {
    newTest({
      title: 'Can do vit on a matching tag',
      start: ['one <blink>he|llo</blink> two'],
      keysPressed: 'vitd',
      end: ['one <blink>|</blink> two'],
      endMode: ModeName.Normal,
    });

    newTest({
      title: 'Can do vat on a matching tag',
      start: ['one <blink>he|llo</blink> two'],
      keysPressed: 'vatd',
      end: ['one | two'],
      endMode: ModeName.Normal,
    });
  });

  newTest({
    title: 'Can do vi) on a matching parenthesis',
    start: ['test(te|st)'],
    keysPressed: 'vi)d',
    end: ['test(|)'],
    endMode: ModeName.Normal,
  });

  newTest({
    title: 'Can do va) on a matching parenthesis',
    start: ['test(te|st);'],
    keysPressed: 'va)d',
    end: ['test|;'],
    endMode: ModeName.Normal,
  });

  newTest({
    title: 'Can do va} on a matching bracket as first character',
    start: ['1|{', 'test', '}1'],
    keysPressed: 'va}d',
    end: ['1|1'],
    endMode: ModeName.Normal,
  });

  newTest({
    title: 'Can do vi( on a matching bracket near first character',
    start: ['test(()=>{', '|', '});'],
    keysPressed: 'vi(d',
    end: ['test(|);'],
    endMode: ModeName.Normal,
  });

  newTest({
    title: 'Can do vi{ on outer pair of nested braces',
    start: ['{', '  te|st', '  {', '    test', '  }', '}'],
    keysPressed: 'vi{d',
    end: ['{', '|}'],
    endMode: ModeName.Normal,
  });

  newTest({
    title: 'Can do vi{ on braces indented by 1 and preserve indent',
    start: ['{', '  t|est', ' }'],
    keysPressed: 'vi{d',
    end: ['{', '| }'],
    endMode: ModeName.Normal,
  });

  suite('handles replace in visual mode', () => {
    newTest({
      title: 'Can do a single line replace',
      start: ['one |two three four five'],
      keysPressed: 'vwwer1',
      end: ['one |11111111111111 five'],
      endMode: ModeName.Normal,
    });

    newTest({
      title: 'Can do a multi line replace',
      start: ['one |two three four five', 'one two three four five'],
      keysPressed: 'vjer1',
      end: ['one |1111111111111111111', '1111111 three four five'],
      endMode: ModeName.Normal,
    });
  });

  newTest({
    title: 'Can use . to repeat indent in visual',
    start: ['|foobar'],
    keysPressed: 'v>.',
    end: ['    |foobar'],
    endMode: ModeName.Normal,
  });

  newTest({
    title: 'Can do v_x to delete to first char',
    start: ['', 'test te|st test', ''],
    keysPressed: 'v_x',
    end: ['', '|t test', ''],
    endMode: ModeName.Normal,
  });

  newTest({
    title: 'Can do vg_x to delete to last char with no EOL',
    start: ['', 'test te|st test', ''],
    keysPressed: 'vg_x',
    end: ['', 'test t|e', ''],
    endMode: ModeName.Normal,
  });

  newTest({
    title: 'Can do v3g_x to delete to last char with no EOL with count',
    start: ['te|st', 'test', 'test', 'test'],
    keysPressed: 'v3g_x',
    end: ['t|e', 'test'],
    endMode: ModeName.Normal,
  });

  newTest({
    title: 'Can do v$x to delete to last char including EOL',
    start: ['', 'test te|st test', ''],
    keysPressed: 'v$x',
    end: ['', 'test t|e'],
    endMode: ModeName.Normal,
  });

  newTest({
    title: 'Can do gv to reselect previous selection',
    start: ['tes|ttest'],
    keysPressed: 'vl<Esc>llgvd',
    end: ['tes|est'],
    endMode: ModeName.Normal,
  });

  suite('D command will remove all selected lines', () => {
    newTest({
      title: 'D deletes all selected lines',
      start: ['first line', 'test| line1', 'test line2', 'second line'],
      keysPressed: 'vjD',
      end: ['first line', '|second line'],
      endMode: ModeName.Normal,
    });

    newTest({
      title: 'D deletes the current line',
      start: ['first line', 'test| line1', 'second line'],
      keysPressed: 'vlllD',
      end: ['first line', '|second line'],
      endMode: ModeName.Normal,
    });
  });

  suite('handles indent blocks in visual mode', () => {
    newTest({
      title: 'Can do vai',
      start: ['if foo > 3:', '    log("foo is big")|', '    foo = 3', 'do_something_else()'],
      keysPressed: 'vaid',
      end: ['|do_something_else()'],
      endMode: ModeName.Normal,
    });

    newTest({
      title: 'Can do vii',
      start: ['if foo > 3:', '    bar|', '    if baz:', '        foo = 3', 'do_something_else()'],
      keysPressed: 'viid',
      end: ['if foo > 3:', '|do_something_else()'],
      endMode: ModeName.Normal,
    });

    newTest({
      title: "Doesn't naively select the next line",
      start: ['if foo > 3:', '    bar|', 'if foo > 3:', '    bar'],
      keysPressed: 'viid',
      end: ['if foo > 3:', '|if foo > 3:', '    bar'],
      endMode: ModeName.Normal,
    });

    newTest({
      title: 'Searches backwards if cursor line is empty',
      start: ['if foo > 3:', '    log("foo is big")', '|', '    foo = 3', 'do_something_else()'],
      keysPressed: 'viid',
      end: ['if foo > 3:', '|do_something_else()'],
      endMode: ModeName.Normal,
    });

    newTest({
      title: 'Can do vaI',
      start: ['if foo > 3:', '    log("foo is big")|', '    foo = 3', 'do_something_else()'],
      keysPressed: 'vaId',
      end: ['|'],
      endMode: ModeName.Normal,
    });
  });

  suite('visualstar', () => {
    setup(() => {
      Globals.mockConfiguration.visualstar = true;
      reloadConfiguration();
    });

    newTest({
      title: 'Works with *',
      start: [
        '|public modes = [ModeName.Visual',
        'public modes = [ModeName.VisualBlock',
        'public modes = [ModeName.VisualLine',
      ],
      // This is doing a few things:
      // - select to the end of "Visual"
      // - press "*", the cursor will go to the next line since it matches
      // - press "n", the cursor will go to the last line since it matches
      keysPressed: '2vfl*n',
      end: [
        'public modes = [ModeName.Visual',
        'public modes = [ModeName.VisualBlock',
        '|public modes = [ModeName.VisualLine',
      ],
      endMode: ModeName.Normal,
    });

    newTest({
      title: 'Works with #',
      start: [
        'public modes = [ModeName.Visual',
        'public modes = [ModeName.VisualBlock',
        '|public modes = [ModeName.VisualLine',
      ],
      // This is doing a few things:
      // - select to the end of "Visual"
      // - press "#", the cursor will go to the previous line since it matches
      // - press "n", the cursor will go to the first line since it matches
      keysPressed: '2vfl#n',
      end: [
        '|public modes = [ModeName.Visual',
        'public modes = [ModeName.VisualBlock',
        'public modes = [ModeName.VisualLine',
      ],
      endMode: ModeName.Normal,
    });
  });

  suite('search works in visual mode', () => {
    newTest({
      title: 'Works with /',
      start: ['f|oo', 'bar', 'fun', 'baz'],
      keysPressed: 'v/baz\nx',
      end: ['f|az'],
    });

    newTest({
      title: 'Works with ?',
      start: ['foo', 'bar', 'fun', 'b|az'],
      keysPressed: 'v?foo\nx',
      end: ['|z'],
    });

    test('Selects correct range', async () => {
      await modeHandler.handleMultipleKeyEvents('ifoo bar fun baz'.split(''));
      await modeHandler.handleMultipleKeyEvents(['<Esc>', 'g', 'g', 'v', 'w', '/']);

      const selection = TextEditor.getSelection();

      // ensuring selection range starts from the beginning
      assertEqual(selection.start.character, 0);
      assertEqual(selection.start.line, 0);
      assertEqual(selection.end.character, 4);
      assertEqual(selection.end.line, 0);
    });
  });

  suite('X will delete linewise', () => {
    newTest({
      title: 'normal selection',
      start: ['this is', 'the| best', 'test i have seen in', 'the world'],
      keysPressed: 'vjX',
      end: ['this is', '|the world'],
    });

    newTest({
      title: 'normal selection',
      start: ['this is', 'the| best', 'test i have seen in', 'the world'],
      keysPressed: 'vj$X',
      end: ['this is', '|the world'],
    });
  });

  suite('C will delete linewise', () => {
    newTest({
      title: 'normal selection',
      start: ['this is', 'the| best', 'test i have seen in', 'the world'],
      keysPressed: 'vjC',
      end: ['this is', '|', 'the world'],
    });

    newTest({
      title: 'normal selection',
      start: ['this is', 'the| best', 'test i have seen in', 'the world'],
      keysPressed: 'vj$C',
      end: ['this is', '|', 'the world'],
    });
  });

  suite('R will delete linewise', () => {
    newTest({
      title: 'normal selection',
      start: ['this is', 'the| best', 'test i have seen in', 'the world'],
      keysPressed: 'vjR',
      end: ['this is', '|', 'the world'],
    });

    newTest({
      title: 'normal selection',
      start: ['this is', 'the| best', 'test i have seen in', 'the world'],
      keysPressed: 'vj$R',
      end: ['this is', '|', 'the world'],
    });
  });

  suite('Linewise Registers will be inserted properly', () => {
    newTest({
      title: 'downward selection',
      start: ['i ya|nked', 'this line', '', '1.line', 'a123456', 'b123456', '2.line'],
      keysPressed: 'vjY4j3lvjllp',
      end: ['i yanked', 'this line', '', '1.line', 'a12', '|i yanked', 'this line', '6', '2.line'],
    });

    newTest({
      title: 'upward selection',
      start: ['i yanked', 'this| line', '', '1.line', 'a123456', 'b123456', '2.line'],
      keysPressed: 'vkY4j3lvjllp',
      end: ['i yanked', 'this line', '', '1.line', 'a12', '|i yanked', 'this line', '6', '2.line'],
    });
  });

  suite('Non-darwin <C-c> tests', () => {
    if (process.platform === 'darwin') {
      return;
    }

    test('<C-c> copies and sets mode to normal', async () => {
      await modeHandler.handleMultipleKeyEvents('ione two three'.split(''));
      await modeHandler.handleMultipleKeyEvents(['<Esc>', '^', 'v', 'e', '<C-c>']);

      // ensuring we're back in normal
      assertEqual(modeHandler.currentMode.name, ModeName.Normal);
      assertEqualLines(['one two three']);

      // test copy by pasting back
      await modeHandler.handleMultipleKeyEvents(['^', '"', '+', 'P']);

      assertEqualLines(['oneone two three']);
    });
  });

  suite('vi{ will go to end of second to last line', () => {
    newTest({
      title: 'select',
      start: ['    func() {', '    |    hi;', '        alw;', '    }'],
      keysPressed: 'vi{yGP',
      end: ['    func() {', '        hi;', '        alw;', '|        hi;', '        alw;', '    }'],
    });
  });

  suite('Transition between visual mode', () => {
    test('vv will back to normal mode', async () => {
      await modeHandler.handleMultipleKeyEvents(['v', 'v']);
      assertEqual(modeHandler.currentMode.name, ModeName.Normal);
    });

    test('vV will transit to visual line mode', async () => {
      await modeHandler.handleMultipleKeyEvents(['v', 'V']);
      assertEqual(modeHandler.currentMode.name, ModeName.VisualLine);
    });

    test('v<C-v> will transit to visual block mode', async () => {
      await modeHandler.handleMultipleKeyEvents(['v', '<C-v>']);
      assertEqual(modeHandler.currentMode.name, ModeName.VisualBlock);
    });

    test('Vv will transit to visual (char) mode', async () => {
      await modeHandler.handleMultipleKeyEvents(['V', 'v']);
      assertEqual(modeHandler.currentMode.name, ModeName.Visual);
    });

    test('VV will back to normal mode', async () => {
      await modeHandler.handleMultipleKeyEvents(['V', 'V']);
      assertEqual(modeHandler.currentMode.name, ModeName.Normal);
    });

    test('V<C-v> will transit to visual block mode', async () => {
      await modeHandler.handleMultipleKeyEvents(['V', '<C-v>']);
      assertEqual(modeHandler.currentMode.name, ModeName.VisualBlock);
    });

    test('<C-v>v will transit to visual (char) mode', async () => {
      await modeHandler.handleMultipleKeyEvents(['<C-v>', 'v']);
      assertEqual(modeHandler.currentMode.name, ModeName.Visual);
    });

    test('<C-v>V will back to visual line mode', async () => {
      await modeHandler.handleMultipleKeyEvents(['<C-v>', 'V']);
      assertEqual(modeHandler.currentMode.name, ModeName.VisualLine);
    });

    test('<C-v><C-v> will back to normal mode', async () => {
      await modeHandler.handleMultipleKeyEvents(['<C-v>', '<C-v>']);
      assertEqual(modeHandler.currentMode.name, ModeName.Normal);
    });
  });
});

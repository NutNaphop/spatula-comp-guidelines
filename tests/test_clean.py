"""Payload extraction has to survive whatever JS wrapper upstream uses,
without being fooled by braces inside string literals.
"""
import json

import pytest

from spatula.clean import extract_json_payload


@pytest.mark.parametrize("wrapper", [
    'var chess = {}; ',
    'window.chess = {};',
    'export default {};',
    '{}',
    '﻿var chess = {}',            # BOM
    '// comment\nvar chess = {} ;\n',
])
def test_unwraps_common_js_forms(wrapper):
    payload = wrapper.replace("{}", '{"id":"1","name":"Bard"}')
    assert json.loads(extract_json_payload(payload)) == {"id": "1", "name": "Bard"}


def test_handles_top_level_array():
    src = 'var versions = [{"v":"1"},{"v":"2"}];'
    assert json.loads(extract_json_payload(src)) == [{"v": "1"}, {"v": "2"}]


def test_ignores_braces_inside_strings():
    src = 'var x = {"desc":"deals {damage} to [all] enemies","id":"2"};'
    assert json.loads(extract_json_payload(src)) == {
        "desc": "deals {damage} to [all] enemies", "id": "2"}


def test_ignores_escaped_quote_inside_string():
    src = r'var x = {"name":"Rabadon\"s","id":"3"};'
    assert json.loads(extract_json_payload(src))["id"] == "3"


def test_stops_at_first_complete_object():
    src = 'var a = {"id":"1"}; var b = {"id":"2"};'
    assert json.loads(extract_json_payload(src)) == {"id": "1"}


def test_rejects_file_without_json():
    with pytest.raises(ValueError, match="no '{' or"):
        extract_json_payload("console.log('nothing here');")


def test_rejects_truncated_file():
    with pytest.raises(ValueError, match="unbalanced"):
        extract_json_payload('var x = {"id":"1", "sub": {')

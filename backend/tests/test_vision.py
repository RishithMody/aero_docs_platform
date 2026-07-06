from app.services.vision import extract_part_numbers


def test_extract_part_numbers_with_prefix():
    text = "Replace seal kit P/N: PN-HYD-4521-A before reassembly."
    result = extract_part_numbers(text)
    assert "PN-HYD-4521-A" in result


def test_extract_standalone_part_number():
    text = "Order part HYD-4521 from Honeywell inventory."
    result = extract_part_numbers(text)
    assert "HYD-4521" in result


def test_extract_multiple_part_numbers():
    text = "Primary P/N HYD-4521 and backup PN-9999-ZZ required."
    result = extract_part_numbers(text)
    assert "HYD-4521" in result
    assert "PN-9999-ZZ" in result


def test_extract_empty_text():
    assert extract_part_numbers("") == []

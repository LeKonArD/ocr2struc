#!/usr/bin/env python3

import re
import pandas as pd
from lxml import etree

namespace = {"a": "http://schema.primaresearch.org/PAGE/gts/pagecontent/2017-07-15",
             "b": "http://www.w3.org/2001/XMLSchema-instance",
             "c": "http://schema.primaresearch.org/PAGE/gts/pagecontent/2017-07-15 http://schema.primaresearch.org/PAGE/gts/pagecontent/2017-07-15/pagecontent.xsd"}


def parse_coordinates(coordinates):

    coordinates = re.sub("\[|\'","",coordinates)
    coordinates = re.sub("\,"," ",coordinates)
    coordinates = coordinates.split(" ")

    return coordinates


def parse_pagexml(filepaths):

    page_counter = 0
    parsed_lines = []

    for filepath in filepaths:

        xmltree = etree.parse(filepath)
        page_coords = xmltree.xpath("//a:Page/a:TextRegion/a:Coords/@points",namespaces=namespace)
        page_coords = parse_coordinates(page_coords[0])
        finder = etree.XPath("//a:TextLine", namespaces=namespace)
        ocr_lines = finder(xmltree)

        for ocr_line in ocr_lines:

            line_info = parse_pagexml_lines(ocr_line)

            line_info.append(int(page_coords[0]))
            line_info.append(int(page_coords[1]))
            line_info.append(int(page_coords[2]))
            line_info.append(int(page_coords[3]))
            line_info.append(int(page_coords[4]))
            line_info.append(int(page_coords[5]))
            line_info.append(int(page_coords[6]))
            line_info.append(int(page_coords[7]))

            line_info.append(page_counter)
            line_info.append(filepath)
            parsed_lines.append(line_info)

        page_counter += 1

    parsed_lines = pd.DataFrame(parsed_lines, columns=["line_id","c1","c2","c3","c4","c5","c6","c7","c8","text",
                                                      "cb1","cb2","cb3","cb4","cb5","cb6","cb7","cb8","page_id",
                                                      "filepath"])

    parsed_lines = parsed_lines.sort_values(by=["page_id", "line_id"])

    return parsed_lines


def parse_pagexml_lines(input_line):

    line_id = input_line.get("id")
    coords = input_line.xpath("a:Coords/@points", namespaces=namespace)[0]
    coords = parse_coordinates(coords)

    try:
        line_text = input_line.xpath("a:TextEquiv/a:Unicode/text()", namespaces=namespace)[0]
    except IndexError:
        line_text = ""

    parsed_line = [line_id, int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3]), int(coords[4]),
                   int(coords[5]), int(coords[6]), int(coords[7]), line_text]

    return parsed_line



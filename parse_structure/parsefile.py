from lxml import etree
import re
import logging

from elements import *

def parse_file(file):
    logging.info("Parsing file %s" % file.name)
    tree = _strip_ns_prefix(etree.parse(file))

    filename = tree.xpath("//Page/@imageFilename")[0]
    width = int(tree.xpath("//Page/@imageWidth")[0])
    height = int(tree.xpath("//Page/@imageHeight")[0])

    page = Page(filename, width, height)

    def _parse_line(el):
        text = el.xpath(".//Unicode/text()")
        text = text[0] if len(text) else None
        coordsStr = el.xpath(".//Coords/@points")[0]

        coords = list(map(lambda x: int(x), re.findall("[0-9]+", coordsStr)))
        return TextLine(text, page, coords[0], coords[1], coords[4], coords[5])

    lines = list(map(_parse_line, tree.xpath("//TextLine")))
    return lines
    

# https://stackoverflow.com/a/30233635
def _strip_ns_prefix(tree):
    #xpath query for selecting all element nodes in namespace
    query = "descendant-or-self::*[namespace-uri()!='']"
    #for each element returned by the above xpath query...
    for element in tree.xpath(query):
        #replace element name with its local name
        element.tag = etree.QName(element).localname
    return tree


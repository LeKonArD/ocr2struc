from lxml import etree
import re
import os
import logging

from elements import *

def parse_file(file, format=None):
    logging.info("Parsing file %s" % file.name)
    namespaces, tree = _strip_ns_prefix(etree.parse(file))

    if (format is None):
        if (any("primaresearch.org" in n for n in namespaces)):
            format = "primaresearch"
        if (any("abbyy.com" in n for n in namespaces)):
            format = "abbyy"

    if (format is "primaresearch"):
        return _parse_prima(file, tree)
    elif (format is "abbyy"):
        return _parse_abbyy(file, tree)
    else:
        logging.error("Could not recognize schema of %s" % file.name)


def _parse_prima(xmlFile, tree):
    imgFilename = tree.xpath("//Page/@imageFilename")[0]
    width = int(tree.xpath("//Page/@imageWidth")[0])
    height = int(tree.xpath("//Page/@imageHeight")[0])

    page = Page(imgFilename, width, height)

    def _parse_line(el):
        text = el.xpath(".//Unicode/text()")
        text = text[0] if len(text) else None
        coordsStr = el.xpath(".//Coords/@points")[0]

        coords = list(map(lambda x: int(x), re.findall("[0-9]+", coordsStr)))
        return TextLine(text, page, coords[0], coords[1], coords[4], coords[5])

    lines = list(map(_parse_line, tree.xpath("//TextLine")))
    return { 'page': page, 'lines': lines }

def _parse_abbyy(xmlFile, tree):
    # TODO Bilddatei in Abbyy nicht spezifiziert
    imgFilename = re.sub(r'\.xml$', ".png", os.path.basename(xmlFile.name))

    width = int(tree.xpath("//page/@width")[0])
    height = int(tree.xpath("//page/@height")[0])

    page = Page(imgFilename, width, height)

    def _parse_line(el):
        text = el.xpath("./formatting/text()")
        text = text[0] if len(text) else None
        attribs = el.attrib

        coords = list(map(lambda x: int(x), [ attribs["l"], attribs["t"], attribs["r"], attribs["b"] ]))
        line = TextLine(text, page, coords[0], coords[1], coords[2], coords[3])

        if ((el.getparent().tag == 'par') and (el.getparent().index(el) == 0)):
            line.annotations["beginpar"] = True

        return line

    lines = list(map(_parse_line, tree.xpath("//line")))
    return { 'page': page, 'lines': lines }
    

# https://stackoverflow.com/a/30233635
def _strip_ns_prefix(tree):
    namespaces = tree.getroot().nsmap.values()

    #xpath query for selecting all element nodes in namespace
    query = "descendant-or-self::*[namespace-uri()!='']"
    #for each element returned by the above xpath query...
    for element in tree.xpath(query):
        #replace element name with its local name
        element.tag = etree.QName(element).localname
    return namespaces, tree


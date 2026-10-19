import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const data = await request.json();

    console.log(
      "Pre-checkin recebido:",
      data.protelReservationID
    );

    // --------------------------------------------------
    // Validações
    // --------------------------------------------------

    if (!data.propertyTag) {
      return NextResponse.json(
        {
          success: false,
          error: "propertyTag é obrigatório.",
        },
        { status: 400 }
      );
    }

    if (!data.protelReservationID) {
      return NextResponse.json(
        {
          success: false,
          error: "protelReservationID é obrigatório.",
        },
        { status: 400 }
      );
    }

    if (!data.protelGuestID) {
      return NextResponse.json(
        {
          success: false,
          error: "protelGuestID é obrigatório.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Converter datas
    // --------------------------------------------------

    const requestDate =
      new Date(data.requestDate);

    const protelValidFrom =
      new Date(data.protelValidFrom);

    const protelValidUntil =
      new Date(data.protelValidUntil);

    const birthDate =
      new Date(data.birthDate);

    const documentIssueDate =
      new Date(data.documentIssueDate);

    const documentExpirationDate =
      new Date(data.documentExpirationDate);

    const resendDate =
      new Date(data.resendDate);

    let responseDate = null;

    if (data.responseDate) {
      responseDate =
        new Date(data.responseDate);
    }

    // --------------------------------------------------
    // Validar datas
    // --------------------------------------------------

    const dates = [
      requestDate,
      protelValidFrom,
      protelValidUntil,
      birthDate,
      documentIssueDate,
      documentExpirationDate,
      resendDate,
    ];

    for (const date of dates) {
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Uma das datas recebidas é inválida.",
          },
          { status: 400 }
        );
      }
    }

    if (
      responseDate &&
      Number.isNaN(responseDate.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "responseDate inválida.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // INSERT
    // --------------------------------------------------

    const stay =
      await prisma.myStayDetails.create({
        data: {
          requestDate,

          propertyTag:
            data.propertyTag,

          protelMpeHotel:
            data.protelMpeHotel || "",

          protelReservationID:
            data.protelReservationID,

          protelRoomID:
            data.protelRoomID || "",

          protelGuestID:
            data.protelGuestID,

          protelGuestEmail:
            data.protelGuestEmail || null,

          protelGuestPhone:
            data.protelGuestPhone || null,

          protelValidFrom,

          protelValidUntil,

          control: "N",

          reponseToken:
            data.reponseToken || null,

          reponseURL:
            data.reponseURL || null,

          protelBookingID:
            data.protelBookingID || "",

          protelRoomTypeID:
            data.protelRoomTypeID || "",

          responseDate,

          vatNo:
            data.vatNo || null,

          child:
            Number(data.child || 0),

          adult:
            Number(data.adult || 1),

          country:
            data.country || "",

          city:
            data.city || "",

          postalCode:
            data.postalCode || null,

          nationality:
            data.nationality || "",

          birthCountry:
            data.birthCountry || "",

          birthDate,

          identificationDocument:
            data.identificationDocument || "",

          documentIssueDate,

          documentExpirationDate,

          Resend:
            data.Resend ||
            data.resend ||
            "N",

          ResendDate:
            resendDate,

          protelSalutation:
            data.protelSalutation || null,

          protelGuestFirstName:
            data.protelGuestFirstName || null,

          protelGuestLastName:
            data.protelGuestLastName || null,

          protelCountryID:
            data.protelCountryID !== null &&
            data.protelCountryID !== undefined &&
            data.protelCountryID !== ""
              ? Number(data.protelCountryID)
              : null,

          protelAddress:
            data.protelAddress || null,

          protelGuestMobilePhone:
            data.protelGuestMobilePhone || null,

          protelDocType:
            data.protelDocType || null,

          protelProfileType:
            data.protelProfileType || null,

          preCheckinControl: "S",
        },
      });

    // --------------------------------------------------
    // INSERT CONCLUÍDO
    // --------------------------------------------------

    console.log(
      `Pre-checkin inserido. recordID: ${stay.recordID}`
    );

    // --------------------------------------------------
    // CHAMAR PROCESSAMENTO AUTOMÁTICO
    // --------------------------------------------------

    console.log(
      "A chamar /api/processPrecheckin..."
    );

    let processResult = null;
    let processError = null;

    try {
      const processResponse =
        await fetch(
          "https://demo.mypms.pt/api/processPrecheckin",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );

      const responseText =
        await processResponse.text();

      console.log(
        `processPrecheckin HTTP: ${processResponse.status}`
      );

      console.log(
        "Resposta processPrecheckin:",
        responseText
      );

      if (!processResponse.ok) {
        processError =
          `processPrecheckin devolveu HTTP ${processResponse.status}: ${responseText}`;
      } else {
        try {
          processResult =
            JSON.parse(responseText);
        } catch {
          processResult =
            responseText;
        }
      }
    } catch (error) {
      processError =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        "Erro ao chamar processPrecheckin:",
        error
      );
    }

    // --------------------------------------------------
    // SUCESSO
    // --------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        message:
          "Pre-checkin inserido com sucesso.",

        recordID:
          stay.recordID,

        processing:
          processError
            ? "error"
            : "completed",

        processResult,

        processError,
      },
      {
        status: 201,
      }
    );

  } catch (error) {
    console.error(
      "Erro ao inserir em myStayDetails:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}